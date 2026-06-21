# -*- coding: utf-8 -*-
"""
core.py — Loi xep (nesting) chi tiet trong 1 file DXF len tam thep/inox cho may
cat laser, tach net cat / net chan, xep N bo, kiem tra khong chong, xuat DXF.

Tach tu nest_sheet.py de GUI goi duoc theo tung buoc:
  scan_groups(dxf)            -> danh sach nhom do day phat hien (nhan + vi tri)
  run_nest(dxf, out, ...)     -> xep, kiem tra, xuat file tung tam + anh + bao cao
  merge_by_label(out, ...)    -> gop cac tam cung 1 nhom thanh 1 file de cat 1 luot

Quy uoc:
  - Don vi mm.
  - Net "chan" (gap, khong cat) nhan dien theo tu khoa layer -> layer CHAN_KHONG_CAT.
  - Chi doi cung (xoay/tinh tien) -> net cat giong y ban goc.
"""
import os, re, math
from collections import defaultdict

import ezdxf
import rectpack
from ezdxf import bbox, path as epath
from ezdxf.addons import Importer
from shapely.geometry import LineString, Polygon, Point
from shapely.ops import unary_union
from shapely.affinity import rotate as shp_rotate, translate as shp_translate

# do day pho bien cho dropdown (mm)
THICKNESS_CHOICES = ["0.8", "1.0", "1.2", "1.4", "1.5", "2.0", "2.5", "3.0", "4.0", "5.0"]
MATERIALS = ["SAT", "INOX"]
DEFAULT_FOLD = ["chan", "chấn", "duong chan", "đường chấn", "bend"]


def _is_degenerate(e):
    """Net SUY BIEN: LINE dai ~0, CIRCLE ban kinh ~0, ARC DAI CUNG ~0, polyline ~0 -> RAC
    (CAD artifact). Neu cat se thanh cham vun tren thep + ton diem moi -> LOC BO. Nguong
    0.1mm (duoi be rong tia laser nen chac chan khong phai chi tiet that)."""
    import math as _m
    try:
        t = e.dxftype()
        if t == "LINE":
            s, en = e.dxf.start, e.dxf.end
            return ((s.x - en.x) ** 2 + (s.y - en.y) ** 2) ** 0.5 < 0.1
        if t == "CIRCLE":
            return float(e.dxf.radius) < 0.1
        if t == "ARC":
            span = abs(float(e.dxf.end_angle) - float(e.dxf.start_angle)) % 360.0
            return float(e.dxf.radius) * _m.radians(span) < 0.1   # DAI CUNG, khong phai ban kinh
        if t == "LWPOLYLINE":
            b = bbox.extents([e])
            return b.has_data and max(b.extmax.x - b.extmin.x, b.extmax.y - b.extmin.y) < 0.1
    except Exception:
        return False
    return False


def _ent_geom_key(e):
    """Khoa hinh hoc (lam tron 0.01mm) de bo net TRUNG KHIT -> laser khoi cat 2 lan
    cung 1 duong (do moi 2 lan + chay cong canh). Net trung dung toa do tuyet doi nen
    chi gom net that su chong khit, khong dung cham vong tron dong tam khac ban kinh."""
    try:
        t = e.dxftype(); lay = e.dxf.layer or ""
        if t == "LINE":
            a = (round(e.dxf.start.x, 2), round(e.dxf.start.y, 2))
            b = (round(e.dxf.end.x, 2), round(e.dxf.end.y, 2))
            return ("L", lay) + tuple(sorted([a, b]))     # khong phan biet chieu ve
        if t == "CIRCLE":
            return ("C", lay, round(e.dxf.center.x, 2), round(e.dxf.center.y, 2),
                    round(float(e.dxf.radius), 2))
        if t == "ARC":
            return ("A", lay, round(e.dxf.center.x, 2), round(e.dxf.center.y, 2),
                    round(float(e.dxf.radius), 2), round(float(e.dxf.start_angle), 1),
                    round(float(e.dxf.end_angle), 1))
        if t == "LWPOLYLINE":
            return ("P", lay) + tuple((round(x, 2), round(y, 2)) for x, y, *_ in e.get_points())
    except Exception:
        return None
    return None


def _setup_out_layers(doc):
    """Layer chuan file xuat: CUT (do=CAT) | CHAN_KHONG_CAT (xanh, NET DUT = chan/khac/danh dau,
    KHONG cat) | KHUNG_THAM_KHAO (xam = vien tham khao). Net chan BYLAYER tu thanh NET DUT nho
    layer CHAN dung linetype HIDDEN (giong ban ve goc: layer chan = HIDDEN)."""
    try:
        if "HIDDEN" not in doc.linetypes:
            doc.linetypes.add("HIDDEN", pattern=[6.35, 3.175, -3.175], description="Net dut chan/khac")
    except Exception:
        pass
    if "CUT" not in doc.layers:
        doc.layers.add("CUT", color=1)
    if "CHAN_KHONG_CAT" not in doc.layers:
        doc.layers.add("CHAN_KHONG_CAT", color=5, linetype="HIDDEN")   # NET DUT
    if "KHUNG_THAM_KHAO" not in doc.layers:
        doc.layers.add("KHUNG_THAM_KHAO", color=8)


def is_fold_layer(layer, fold=None):
    """Layer co phai DUONG CHAN (gap/fold — KHONG cat) khong. Chuan hoa DAU + NFD/NFC bang
    _strip_accents ca 2 ve -> 'chấn'/'đường chấn' du go/luu kieu nao (NFC hay NFD) van nhan
    DUNG, tranh cat nham duong chan = HONG phoi. Dung CHUNG cho moi cho phan loai."""
    l = _strip_accents(layer or "").lower()
    for k in (fold or DEFAULT_FOLD):
        k2 = _strip_accents(k or "").strip().lower()
        if k2 and k2 in l:
            return True
    return False


def _is_dashed_lt(e):
    """Entity co linetype NET DUT (HIDDEN/DASH/DOT/CENTER/PHANTOM...) -> coi la net dut."""
    lt = (e.dxf.get("linetype", "") or "").upper()
    return any(k in lt for k in ("HIDDEN", "DASH", "DOT", "CENTER", "PHANTOM", "DIVIDE"))


def _classify_out(e, fold=None):
    """Gan layer + linetype CHUAN cho 1 net khi xuat (Duy: NET CAT = continue, NET DUT = layer HIDDEN):
    - net chan (layer chan) HOAC linetype dut -> layer CHAN_KHONG_CAT + linetype HIDDEN (khong cat)
    - con lai = net CAT -> layer CUT + linetype Continuous (LIEN TUC, tuong minh, khong giu net dut la)."""
    try:
        if is_fold_layer(e.dxf.layer or "", fold) or _is_dashed_lt(e):
            e.dxf.layer = "CHAN_KHONG_CAT"
            e.dxf.linetype = "HIDDEN"
        else:
            e.dxf.layer = "CUT"
            e.dxf.linetype = "Continuous"   # NET CAT = LIEN TUC tuong minh
        e.dxf.color = 256                   # BYLAYER (mau theo layer)
    except Exception:
        pass


def _finalize_doc(doc):
    """Hoan thien file xuat cho AutoCAD: don vi mm + KHUNG NHIN (vport) om dung geometry.
    Mac dinh ezdxf khung nhin o goc 0,0 -> AutoCAD mo lech, re chuot kho bat diem. zoom.extents()
    dat vport om het net -> mo len thay dung cho, BAT DIEM (osnap) chuan."""
    try:
        doc.header["$INSUNITS"] = 4         # mm (truoc bi 6 = met -> sai ti le)
        doc.header["$MEASUREMENT"] = 1      # he met
        doc.header["$LUNITS"] = 2
    except Exception:
        pass
    try:
        from ezdxf import zoom
        zoom.extents(doc.modelspace(), factor=1.05)   # khung nhin om geometry
    except Exception:
        pass


MIN_PART_MM = 14.0   # mieng nho hon (max canh) coi la net vun/rac -> bo


def _strip_accents(s):
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", s or "")
                   if unicodedata.category(c) != "Mn")


def _from_filename(dxf_path):
    """Doan (vat_lieu, do_day) tu TEN FILE — vd 'SAT_1.4mm_GOP.dxf' -> ('SAT','1.4').
    Dung khi nap lai file da xep (GOP) khong con nhan 'X MM' trong ban ve."""
    base = _strip_accents(os.path.basename(dxf_path or "")).upper()
    mat = None
    if "INOX" in base or "SUS" in base:
        mat = "INOX"
    elif "SAT" in base or "THEP" in base:
        mat = "SAT"
    m = re.search(r"(\d+(?:\.\d+)?)\s*MM", base)
    return mat, (m.group(1) if m else None)


def _entity_length(e):
    """Do dai duong cat cua 1 entity (mm). Tinh tay -> on dinh moi phien ban ezdxf."""
    dt = e.dxftype()
    try:
        if dt == "LINE":
            s, en = e.dxf.start, e.dxf.end
            return math.hypot(en.x - s.x, en.y - s.y)
        if dt == "CIRCLE":
            return 2 * math.pi * e.dxf.radius
        if dt == "ARC":
            a0 = math.radians(e.dxf.start_angle); a1 = math.radians(e.dxf.end_angle)
            span = (a1 - a0) % (2 * math.pi)
            return e.dxf.radius * span
        if dt in ("LWPOLYLINE", "POLYLINE", "SPLINE", "ELLIPSE"):
            pts = list(e.flattening(0.4))   # gom ca cung (bulge)
            return sum(math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])
                       for i in range(len(pts) - 1))
    except Exception:
        return 0.0
    return 0.0


def cut_metrics(entities, is_fold_fn=None):
    """(tong_do_dai_cat_mm, so_diem_moi) cho danh sach entities.
    Diem moi = so duong cat khep kin rieng biet (moi vong = 1 lan moi)."""
    if is_fold_fn is None:
        is_fold_fn = is_fold_layer
    total = 0.0
    closed = 0
    parent = {}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]; x = parent[x]
        return x

    def union(a, b):
        parent.setdefault(a, a); parent.setdefault(b, b)
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    def key(x, y):
        return (round(x / 0.5), round(y / 0.5))

    for e in entities:
        try:
            if is_fold_fn(e.dxf.layer):
                continue
        except Exception:
            pass
        total += _entity_length(e)
        dt = e.dxftype()
        if dt == "CIRCLE" or (dt in ("LWPOLYLINE", "POLYLINE") and getattr(e, "closed", False)):
            closed += 1
            continue
        try:    # entity ho -> noi 2 dau mut, dem so cum lien thong
            if dt == "LINE":
                s, en = e.dxf.start, e.dxf.end
                union(key(s.x, s.y), key(en.x, en.y))
            elif dt == "ARC":
                c = e.dxf.center; r = e.dxf.radius
                a0 = math.radians(e.dxf.start_angle); a1 = math.radians(e.dxf.end_angle)
                p0 = (c.x + r * math.cos(a0), c.y + r * math.sin(a0))
                p1 = (c.x + r * math.cos(a1), c.y + r * math.sin(a1))
                union(key(*p0), key(*p1))
            else:
                pts = list(e.flattening(0.4))
                if len(pts) >= 2:
                    union(key(pts[0][0], pts[0][1]), key(pts[-1][0], pts[-1][1]))
        except Exception:
            pass
    comps = set(find(x) for x in parent)
    return total, closed + len(comps)


def _lines_of(pe):
    L = []
    for e in pe:
        try:
            p = epath.make_path(e)
            pts = [(v.x, v.y) for v in p.flattening(0.4)]
            if len(pts) >= 2:
                L.append(LineString(pts))
        except Exception:
            pass
    return L


def _silhouette(pe, fallback_box):
    """Duong bao LUON BAO TRUM toan bo net -> dam bao khong chong."""
    L = _lines_of(pe)
    if L:
        merged = unary_union(L)
        for w in (0.8, 1.5, 2.5, 4.0, 6.0):
            reg = merged.buffer(w, join_style=2, cap_style=2)
            if reg.geom_type == "Polygon" and reg.area > 50:
                return Polygon(reg.exterior)
        hull = merged.convex_hull
        if hull.geom_type == "Polygon" and hull.area > 50:
            return hull
    x0, y0, x1, y1 = fallback_box
    return Polygon([(x0, y0), (x1, y0), (x1, y1), (x0, y1)])


def _detect_frames(msp):
    """Khung do day = hinh chu nhat (LWPOLYLINE 4-5 dinh) BAO QUANH 1 nhan 'X MM',
    HOAC rat lon (>30% khung lon nhat). Dung nhan MM de bat ca khung NHO (truoc
    day khung nho hon 30% bi bo sot -> gop nham nhieu mieng)."""
    # vi tri cac nhan do day 'X MM'
    mm_pts = []
    for e in msp:
        if e.dxftype() in ("TEXT", "MTEXT"):
            try:
                txt = e.plain_text() if e.dxftype() == "MTEXT" else e.dxf.text
            except Exception:
                continue
            if re.search(r"[\d.]+\s*MM", (txt or "").upper()):
                try:
                    mm_pts.append((e.dxf.insert.x, e.dxf.insert.y))
                except Exception:
                    pass
    cand = []
    for e in msp:
        if e.dxftype() == "LWPOLYLINE":
            if "khung_tham_khao" in (e.dxf.layer or "").lower():
                continue   # khung TAM tham khao (app tu ve khi xuat) -> KHONG phai khung do day
            try:
                npts = len(list(e.get_points()))
            except Exception:
                npts = 0
            b = bbox.extents([e])
            a = (b.extmax.x - b.extmin.x) * (b.extmax.y - b.extmin.y)
            box = (b.extmin.x, b.extmin.y, b.extmax.x, b.extmax.y)
            cand.append((a, npts, e, box))
    if not cand:
        return [], set()
    cand.sort(key=lambda t: t[0], reverse=True)
    amax = cand[0][0]
    frames = []
    for a, npts, e, box in cand:
        if a < 0.01 * amax:
            continue
        is_rect = npts in (4, 5)
        has_label = is_rect and any(box[0] <= lx <= box[2] and box[1] <= ly <= box[3]
                                    for lx, ly in mm_pts)
        # CHI nhan khung khi co nhan 'X MM' ben trong (hoac >30% NHUNG ban ve co nhan).
        # Ban ve khong co nhan MM nao (vd file GOP da xep) -> KHONG khung -> khong nuot part.
        if has_label or (mm_pts and a > 0.30 * amax):
            frames.append((e, box))
        if len(frames) >= 8:
            break
    boxes = [f[1] for f in frames]
    return boxes, set(id(f[0]) for f in frames)


def _thickness_label(msp, fb):
    """Tra ve (do_day_str | None, vat_lieu_hint 'SAT'|'INOX'|None) tu text trong khung."""
    s = None
    mat = None
    for e in msp:
        if e.dxftype() in ("MTEXT", "TEXT"):
            # DUNG plain_text() cho MTEXT -> bo MA DINH DANG ({\\fArial...;3})
            # (e.text giu nguyen ma -> '3' bi boc trong {...} -> regex truot)
            try:
                t = e.plain_text() if e.dxftype() == "MTEXT" else e.dxf.text
            except Exception:
                t = getattr(e.dxf, "text", "")
            try:
                x, y = e.dxf.insert.x, e.dxf.insert.y
            except Exception:
                continue
            if fb[0] <= x <= fb[2] and fb[1] <= y <= fb[3]:
                up = (t or "").upper()
                m = re.search(r"([\d.]+)\s*MM", up)
                if m:
                    s = m.group(1)
                asc = _strip_accents(up)   # bo dau de so: SẮT -> SAT
                if "INOX" in asc or "SUS" in asc or "STAINLESS" in asc:
                    mat = "INOX"
                elif "SAT" in asc or "THEP" in asc:
                    mat = "SAT"
    return s, mat


def scan_groups(dxf_path):
    """Quet file -> tra ve danh sach nhom do day phat hien duoc.
    Moi nhom: {index, thickness (str mm hoac None), box}. Neu khong co khung do
    day thi tra ve [] (xep chung 1 nhom)."""
    src = ezdxf.readfile(dxf_path)
    msp = src.modelspace()
    fboxes, _ = _detect_frames(msp)
    fmat, fth = _from_filename(dxf_path)   # du phong tu ten file
    out = []
    for i, fb in enumerate(fboxes):
        th, mat = _thickness_label(msp, fb)
        out.append({
            "index": i,
            "thickness": th or fth,     # vd "1.4" hoac None
            "material": mat or fmat,    # "SAT" | "INOX" | None
            "box": fb,
        })
    # khong co khung do day (vd nap lai file GOP) nhung ten file co do day -> 1 nhom chung
    if not out and (fth or fmat):
        out.append({"index": 0, "thickness": fth, "material": fmat, "box": None})
    return out


def _cluster_parts(msp, fboxes, fids, group_labels, tol=8.0, max_dim=None, label_pts=None):
    """Gom net thanh tung chi tiet, gan moi chi tiet vao 1 nhan (label).
    max_dim: bo net co bbox > max_dim (net construction DAI noi nham part).
    label_pts: [(nhan, x, y)] -> gan part theo NHAN gan nhat (ban ve co nhan SAT/INOX X MM)."""
    def excluded_layer(lay):
        l = (lay or "").lower()
        return (l == "defpoints" or l.startswith("dim")
                or "khung_tham_khao" in l)   # bo khung TAM tham khao khi nap lai file GOP

    ents = []
    for e in msp:
        if id(e) in fids:
            continue
        if e.dxftype() in ("DIMENSION", "MTEXT", "TEXT"):
            continue
        if excluded_layer(e.dxf.layer):
            continue
        if _is_degenerate(e):
            continue                          # net suy bien (~0) -> bo, tranh cat cham vun
        # KHONG dedup net trung: logo ve net doi/dam + net giu phoi co the trung khit -> giu nguyen
        try:
            b = bbox.extents([e])
            if not b.has_data:
                continue
        except Exception:
            continue
        if max_dim and max(b.extmax.x - b.extmin.x, b.extmax.y - b.extmin.y) > max_dim:
            continue   # net construction DAI (noi nham nhieu part) -> bo
        ents.append([e, (b.extmin.x, b.extmin.y, b.extmax.x, b.extmax.y)])

    n = len(ents)
    par = list(range(n))

    def find(x):
        while par[x] != x:
            par[x] = par[par[x]]
            x = par[x]
        return x

    def uni(x, y):
        rx, ry = find(x), find(y)
        if rx != ry:
            par[rx] = ry

    def inf(b, t):
        return (b[0] - t, b[1] - t, b[2] + t, b[3] + t)

    def ov(p, q):
        return not (p[2] < q[0] or q[2] < p[0] or p[3] < q[1] or q[3] < p[1])

    ib = [inf(e[1], tol / 2) for e in ents]
    for i in range(n):
        for j in range(i + 1, n):
            if ov(ib[i], ib[j]):
                uni(i, j)
    clusters = defaultdict(list)
    for i in range(n):
        clusters[find(i)].append(i)

    cinfo = {}
    for root, idxs in clusters.items():
        x0 = min(ents[i][1][0] for i in idxs); y0 = min(ents[i][1][1] for i in idxs)
        x1 = max(ents[i][1][2] for i in idxs); y1 = max(ents[i][1][3] for i in idxs)
        pe = [ents[i][0] for i in idxs]
        sil = _silhouette(pe, (x0, y0, x1, y1))
        cinfo[root] = dict(idxs=list(idxs), box=(x0, y0, x1, y1), sil=sil,
                           cx=(x0 + x1) / 2, cy=(y0 + y1) / 2, area=sil.area)

    # Gom lo/net nam TRONG long chi tiet vao dung chi tiet do (theo containment)
    roots = sorted(cinfo, key=lambda r: cinfo[r]["area"])
    alive = set(roots)
    for r in roots:
        if r not in alive:
            continue
        a_ = cinfo[r]
        best = None
        for q in alive:
            if q == r:
                continue
            b_ = cinfo[q]
            if b_["area"] <= a_["area"]:
                continue
            bx = b_["box"]
            if not (bx[0] <= a_["cx"] <= bx[2] and bx[1] <= a_["cy"] <= bx[3]):
                continue
            if b_["sil"].contains(Point(a_["cx"], a_["cy"])):
                if best is None or b_["area"] < cinfo[best]["area"]:
                    best = q
        if best is not None:
            cinfo[best]["idxs"].extend(a_["idxs"]); alive.discard(r)

    def nearest_frame(cx, cy):
        best = 0; bd = 9e18
        for k, fb in enumerate(fboxes):
            ddx = max(fb[0] - cx, 0, cx - fb[2]); ddy = max(fb[1] - cy, 0, cy - fb[3])
            d = ddx * ddx + ddy * ddy
            if d < bd:
                bd = d; best = k
        return best

    parts_by = defaultdict(list)
    pid = 0
    for r in alive:
        idxs = cinfo[r]["idxs"]
        pe = [ents[i][0] for i in idxs]
        sil = cinfo[r]["sil"]
        bx0, by0, bx1, by1 = sil.bounds
        if sil.area < 1 or max(bx1 - bx0, by1 - by0) < MIN_PART_MM:
            continue   # bo cum rong / net vun nho (rac)
        if label_pts:
            grp = min(label_pts, key=lambda L: (cinfo[r]["cx"] - L[1]) ** 2
                      + (cinfo[r]["cy"] - L[2]) ** 2)[0]
        elif fboxes and group_labels:
            k = nearest_frame(cinfo[r]["cx"], cinfo[r]["cy"])
            grp = group_labels.get(k, group_labels.get(str(k), "nhom%d" % (k + 1)))
        else:
            grp = group_labels.get(0, "tatca") if group_labels else "tatca"
        sx0, sy0, sx1, sy1 = sil.bounds
        obox = (sx0, sy0, sx1, sy1)   # vi tri GOC (truoc khi dich) -> de tim ten
        sil = shp_translate(sil, -sx0, -sy0)
        for e in pe:
            try:
                e.translate(-sx0, -sy0, 0)
            except Exception:
                pass
        parts_by[grp].append(dict(entities=pe, sil=sil, w=sx1 - sx0, h=sy1 - sy0,
                                  name="P%d" % pid, obox=obox))
        pid += 1
    return parts_by


def _collect_labels(msp):
    """Lay cac chu (TEXT/MTEXT) co the la TEN chi tiet — bo nhan do day 'X MM'."""
    out = []
    for e in msp:
        if e.dxftype() not in ("TEXT", "MTEXT"):
            continue
        try:
            txt = e.plain_text() if e.dxftype() == "MTEXT" else e.dxf.text
        except Exception:
            try:
                txt = e.dxf.text
            except Exception:
                continue
        txt = (txt or "").strip()
        if not txt or re.search(r"[\d.]+\s*MM", txt.upper()):
            continue
        try:
            x, y = e.dxf.insert.x, e.dxf.insert.y
        except Exception:
            continue
        out.append((txt, x, y))
    return out


def _assign_dwg_names(msp, parts_by):
    """Gan ten part = chu trong ban ve, theo KHOANG CACH GAN NHAT (ten thuong dat
    NGAY DUOI chi tiet). Moi ten gan 1 part, moi part 1 ten."""
    labels = _collect_labels(msp)
    if not labels:
        return
    allp = [p for parts in parts_by.values() for p in parts if p.get("obox")]
    if not allp:
        return

    def dist_to_box(px, py, box):
        x0, y0, x1, y1 = box
        dx = max(x0 - px, 0.0, px - x1)
        dy = max(y0 - py, 0.0, py - y1)
        return (dx * dx + dy * dy) ** 0.5

    # Moi PART lay ten cua label GAN NHAT (trong nguong). 1 ten co the dung cho
    # nhieu manh cua cung 1 chi tiet -> danh so (2),(3). Part gan label nhat lay
    # ten goc, manh xa hon lay ten + so.
    cand = []
    for p in allp:
        box = p["obox"]
        maxdim = max(box[2] - box[0], box[3] - box[1])
        thr = max(300.0, 0.7 * maxdim)
        best = None; bestd = 1e18
        for txt, tx, ty in labels:
            dd = dist_to_box(tx, ty, box)
            if dd < bestd:
                bestd = dd; best = txt
        if best is not None and bestd <= thr:
            cand.append((bestd, p, best))
    cand.sort(key=lambda z: z[0])
    cnt = {}
    for d, p, best in cand:
        cnt[best] = cnt.get(best, 0) + 1
        p["dwg_name"] = best if cnt[best] == 1 else "%s (%d)" % (best, cnt[best])


def extract_parts(dxf_path, group_labels=None, prefix=""):
    """Doc 1 file DXF -> dict {nhan: [chi tiet,...]}. Moi chi tiet gan 'src' (doc
    goc) de xuat duoc. prefix: tien to ten (gop nhieu file -> ten khong trung)."""
    src = ezdxf.readfile(dxf_path)
    msp = src.modelspace()
    use_groups = bool(group_labels) and len(group_labels) > 0
    fboxes, fids = (_detect_frames(msp) if use_groups else ([], set()))
    # file DA XEP (GOP, co khung KHUNG_THAM_KHAO) -> part xep sat (ho 3mm) -> tol nho
    # de KHONG gop nham 2 part canh nhau thanh 1.
    is_nested = any("khung_tham_khao" in (e.dxf.layer or "").lower() for e in msp)
    tol = 2.0 if is_nested else 8.0
    parts_by = _cluster_parts(msp, fboxes, fids, group_labels or {}, tol=tol)
    _assign_dwg_names(msp, parts_by)   # doc ten part tu chu trong ban ve
    for label, parts in parts_by.items():
        for p in parts:
            p["src"] = src
            if prefix:
                p["name"] = prefix + p["name"]
    return parts_by


def _merge_parts_by(list_of_parts_by):
    """Gop nhieu dict {nhan:[parts]} thanh 1."""
    out = defaultdict(list)
    for pb in list_of_parts_by:
        for label, parts in pb.items():
            out[label].extend(parts)
    return dict(out)


def template_parts(sheets, prefix=""):
    """Tach cac PART (co entities+sil+w+h) tu cac TAM cua 1 mau xep -> {nhan: [parts]}
    (nhan = '<VATLIEU>_<dodaymm>'). Dung de GOP DON HANG nhieu lo xep chung 1 tam."""
    import tempfile, io
    by = defaultdict(list)
    tmp = tempfile.mkdtemp()
    for i, s in enumerate(sheets):
        try:
            p = os.path.join(tmp, "tp%d.dxf" % i)
            ezdxf.read(io.StringIO(s["dxf"])).saveas(p)
            pb = extract_parts(p, prefix=prefix)
            th = str(s.get("thickness", "")); mat = (s.get("material") or "SAT")
            label = "%s_%smm" % (mat, th)
            for parts in pb.values():
                for part in parts:
                    if part.get("w", 0) <= 1250 and part.get("h", 0) <= 2500:  # bo vien/qua to
                        by[label].append(part)
        except Exception:
            pass
    return dict(by)


def _read_thick_labels(msp):
    """Doc nhan 'X MM' + vat lieu (SAT/INOX) trong ban ve -> [(VATLIEU_dodaymm, x, y)]."""
    import re
    out = []
    for e in msp:
        if e.dxftype() not in ("TEXT", "MTEXT"):
            continue
        try:
            txt = e.plain_text() if hasattr(e, "plain_text") else e.dxf.text
        except Exception:
            txt = getattr(e.dxf, "text", "")
        asc = _strip_accents(txt or "").upper()
        m = re.search(r"([\d.]+)\s*MM", asc)
        if not m:
            continue
        try:
            th = "%g" % float(m.group(1))
        except Exception:
            continue
        mat = "INOX" if ("INOX" in asc or "SUS" in asc) else "SAT"
        try:
            p = e.dxf.insert
            out.append(("%s_%smm" % (mat, th), float(p.x), float(p.y)))
        except Exception:
            pass
    return out


def parts_from_drawing(dxf_path, sheet=(1250.0, 2500.0)):
    """Tach part tu BAN VE PART ROI co nhan SAT/INOX X MM (vd file 'da dat ten hoan chinh',
    KHONG co khung tam): bo net construction DAI (noi nham part) + gan do day/vat lieu theo NHAN gan nhat."""
    src = ezdxf.readfile(dxf_path)
    msp = src.modelspace()
    label_pts = _read_thick_labels(msp)
    if not label_pts:
        return {}
    SW, SH = sheet
    pb = _cluster_parts(msp, [], set(), {}, tol=8.0,
                        max_dim=max(SW, SH) + 100, label_pts=label_pts)
    out = {}
    for label, parts in pb.items():
        kept = []
        for p in parts:
            p["src"] = src
            if p.get("w", 0) <= SW and p.get("h", 0) <= SH:
                kept.append(p)
        if kept:
            out[label] = kept
    return out


def parts_from_file(dxf_path, fold=None, sheet=(1250.0, 2500.0)):
    """Doc 1 file ban ve LO -> {VATLIEU_dodaymm: [parts]}, TU TACH theo vat lieu (sat/inox) + do day.
    Ho tro: (1) file DA XEP co khung tam; (2) ban ve PART ROI co nhan SAT/INOX X MM (unfold da dat ten)."""
    sheets = extract_layout_templates(dxf_path, fold=fold)
    pb = template_parts(sheets)
    if sum(len(v) for v in pb.values()) > 0:
        return pb
    return parts_from_drawing(dxf_path, sheet=sheet)   # khong co khung -> ban ve part roi co nhan


def analyze_drawing(dxf_path, sheet=(1250.0, 2500.0)):
    """PHAN TICH 1 ban ve cho KHO BAN VE: so manh, so loai tole, can nang PHOI (kg) theo tung
    loai vat lieu+do day, va CANH BAO (tranh sai sot khi cat). Tra ve dict goi gon de luu + hien the.
      n_parts   : tong so manh (chi tiet)
      n_types   : so loai (vat lieu+do day) khac nhau
      weight_kg : tong can nang phoi (kg) = sum(dien tich phoi m2 * do day mm * ti trong)
      materials : [{material, thickness, count, area_m2, weight_kg}]
      warnings  : [str] canh bao (manh qua kho, thieu nhan do day, net ho...)
      labels    : [VATLIEU_dodaymm,...]"""
    pb = parts_from_file(dxf_path, sheet=sheet)
    DENS = {"SAT": 7.85, "INOX": 7.93}
    mats = []; total_w = 0.0; total_parts = 0; warn = []
    for label in sorted(pb):
        parts = pb[label]
        try:
            mat, thmm = label.rsplit("_", 1)
            th = float(thmm.lower().rstrip("m"))      # '2mm'->2 ; '1.4mm'->1.4
        except Exception:
            mat, thmm, th = label, "", 0.0
        area_mm2 = 0.0
        for p in parts:
            try:
                area_mm2 += p["sil"].area
            except Exception:
                area_mm2 += p.get("w", 0) * p.get("h", 0) * 0.75
        area_m2 = area_mm2 / 1e6
        dens = DENS["INOX"] if "inox" in label.lower() else DENS["SAT"]
        w = area_m2 * th * dens
        mats.append({"material": mat, "thickness": thmm.lower().rstrip("m") or "?",
                     "count": len(parts), "area_m2": round(area_m2, 4),
                     "weight_kg": round(w, 2)})
        total_w += w; total_parts += len(parts)
        if th <= 0:
            warn.append("Nhom '%s' THIEU do day -> khong tinh duoc can nang. Dat ten file/nhan 'X MM'." % label)
    if total_parts == 0:
        warn.append("KHONG tach duoc chi tiet nao. Chon file ban ve da xep / co nhan vat lieu-do day.")
    try:
        a = analyze(pb, sheet=sheet)
        for g in a.get("groups", []):
            if g.get("oversize"):           # CHI canh bao manh QUA KHO tam (dang tin cay)
                warn.append("Nhom '%s' co %d manh LON HON kho tam -> cat se loi/thieu." %
                            (g.get("label", "?"), g.get("oversize")))
        # KHONG bao "net ho/open_ends" — detector hay bao NHAM (ban ve thuong van kin),
        # gay hieu nham. Bo theo phan hoi Duy.
    except Exception:
        pass
    return {"n_parts": total_parts, "n_types": len(pb), "weight_kg": round(total_w, 2),
            "materials": mats, "warnings": warn, "labels": list(pb.keys())}


def nest_order(items, out_dir, sheet=(1250.0, 2500.0), gap=3.0, margin=3.0, progress=None):
    """Xep DON HANG nhieu lo: items = [(parts_by, qty, ten), ...] (parts_by da tach san theo
    vat lieu+do day). Gop part cua moi lo x so luong theo NHAN -> xep CHUNG (tiet kiem tam)."""
    from collections import defaultdict as _dd
    combined = _dd(list); manifest = []
    for li, (parts_by, qty, name) in enumerate(items):
        if qty <= 0 or not parts_by:
            continue
        np = 0
        for label, parts in parts_by.items():
            for p in parts:
                # TEN DUY NHAT moi lo -> write_sheet KHONG lan block (chong/dat nham part)
                p["name"] = "L%d_%s" % (li, p.get("name", "P"))
            combined[label].extend(parts * int(qty))   # x so luong lo
            np += len(parts) * int(qty)
        manifest.append({"name": name, "qty": int(qty), "parts": np})
    if not combined:
        return {"sheet": list(sheet), "groups": [], "total_sheets": 0, "all_ok": True,
                "manifest": manifest}
    if progress:
        tot = sum(len(v) for v in combined.values())
        progress("Xếp chung %d chi tiết của đơn hàng..." % tot)
    rep = nest_and_write(dict(combined), out_dir, sheet=sheet, gap=gap, margin=margin,
                         sets=1, progress=progress)
    rep["manifest"] = manifest
    return rep


def _endpoint_health(entities, is_fold_fn=None):
    """Dem dau net HO (cat khong kin) va net vun co lap (dau tam) cua 1 cum net.
    BO QUA net CHAN/GAP (duong chan ghep goc) — chung von ho, KHONG phai loi cat."""
    from math import dist
    if is_fold_fn is None:
        is_fold_fn = is_fold_layer
    segs = []
    for e in entities:
        try:
            if is_fold_fn(e.dxf.layer):
                continue   # net chan/gap -> khong tinh la "dau net ho"
        except Exception:
            pass
        t = e.dxftype()
        try:
            pth = epath.make_path(e); pts = [(v.x, v.y) for v in pth.flattening(0.5)]
        except Exception:
            continue
        if len(pts) < 2:
            continue
        closed = (dist(pts[0], pts[-1]) < 0.05) or t == "CIRCLE"
        xs = [q[0] for q in pts]; ys = [q[1] for q in pts]
        L = max(max(xs) - min(xs), max(ys) - min(ys))
        segs.append((t, pts[0], pts[-1], closed, L))
    cell = 0.3
    grid = defaultdict(list); allpts = []
    for i, s in enumerate(segs):
        if s[3]:
            continue
        for end in (s[1], s[2]):
            allpts.append((end, i))
    for k, (pt, i) in enumerate(allpts):
        grid[(int(pt[0] / cell), int(pt[1] / cell))].append(k)

    def connected(pt, self_i):
        gx, gy = int(pt[0] / cell), int(pt[1] / cell)
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for k in grid.get((gx + dx, gy + dy), []):
                    p2, j = allpts[k]
                    if j != self_i and dist(pt, p2) < 0.2:
                        return True
        return False

    opens = []
    stray = 0
    for i, s in enumerate(segs):
        if s[3]:
            continue
        c1 = connected(s[1], i); c2 = connected(s[2], i)
        if (not c1) and (not c2) and s[0] == "LINE" and s[4] < 4:
            stray += 1   # cham vun rat nho, doc lap
        if not c1:
            opens.append(s[1])
        if not c2:
            opens.append(s[2])
    # HO THAT SU = 2 dau ho GAN nhau (contour gan kin nhung con khe 0.2-8mm).
    # Dau ho DON LE (khong co dau ho nao gan) = rach slit cat de CHAN GHEP GOC
    # / duong tam / duong ke -> CO Y, KHONG tinh la loi.
    open_ends = 0
    for a in range(len(opens)):
        for b in range(len(opens)):
            if a != b and 0.2 <= dist(opens[a], opens[b]) <= 8.0:
                open_ends += 1
                break
    return open_ends, stray


def analyze(parts_by, sheet=(1250.0, 2500.0), gap=3.0, margin=3.0, deep=True):
    """Phan tich sau ban ve -> {groups:[...], warnings:[...], overall:{...}}.
    Khong xep, chi doc. Dung de canh bao truoc khi xep."""
    SW, SH = sheet
    usable_w, usable_h = SW - 2 * margin, SH - 2 * margin
    groups = []; warnings = []
    all_max = 0.0; all_min = 1e18; total_parts = 0; total_area = 0.0
    for label in sorted(parts_by):
        parts = parts_by[label]
        total_parts += len(parts)
        fills = []; curved = 0; over = []; nearfull = []; huge = 0; tiny = 0
        gmax = 0.0
        for p in parts:
            ba = p["w"] * p["h"]
            fill = (p["sil"].area / ba) if ba > 0 else 0
            fills.append(fill)
            if fill < 0.78:
                curved += 1
            md = max(p["w"], p["h"]); gmax = max(gmax, md)
            all_max = max(all_max, md); all_min = min(all_min, md)
            # phan biet: lot CA TAM (cat sat mep duoc) vs lot khi chua bien vs QUA TO that
            fits_sheet = (p["w"] <= SW + 0.5 and p["h"] <= SH + 0.5) or \
                         (p["h"] <= SW + 0.5 and p["w"] <= SH + 0.5)
            fits_usable = (p["w"] <= usable_w and p["h"] <= usable_h) or \
                          (p["h"] <= usable_w and p["w"] <= usable_h)
            info = {"ten": p.get("dwg_name") or p.get("name", "?"),
                    "w": round(p["w"], 0), "h": round(p["h"], 0)}
            if not fits_sheet:
                over.append(info)
                if md > 1.8 * SW or md > SH * 1.02:   # to BAT THUONG -> blob unfold/da ghep
                    huge += 1
            elif not fits_usable:
                nearfull.append(info)                  # to gan bang tam -> cat sat mep / Mau xep
            if md < 8:
                tiny += 1
        oversize = len(over)
        avg_fill = (sum(fills) / len(fills)) if fills else 0
        parea = sum(p["sil"].area for p in parts)
        total_area += parea
        est_util = min(0.92, 0.9 * avg_fill) * 100  # uoc luong % lap day moi tam
        oe = st = 0
        if deep:
            ents = [e for p in parts for e in p["entities"]]
            oe, st = _endpoint_health(ents)
        groups.append({
            "label": label, "parts": len(parts),
            "avg_fill": round(avg_fill * 100, 1),
            "curved": curved, "oversize": oversize, "oversize_parts": over,
            "est_util": round(est_util, 1), "open_ends": oe, "stray": st,
        })
        if huge >= 2:        # nhieu mang to bat thuong -> file unfold / da ghep, auto-nest khong tach duoc
            warnings.append("🧩 NÊN DÙNG MẪU · Nhóm %s: có %d mảng DÍNH NHAU rất to (giống bản vẽ "
                            "UNFOLD / đã ghép sẵn) → tính năng tự xếp KHÔNG tách rời được. Hãy bấm "
                            "“📥 Nhập mẫu” rồi “Dùng mẫu xếp”, hoặc gửi bản vẽ các part RỜI (không dính "
                            "đường chấn)." % (label, huge))
        elif oversize:
            ten = ", ".join("“%s” (%.0f×%.0f)" % (o["ten"], o["w"], o["h"]) for o in over[:4])
            warnings.append("⛔ NGHIÊM TRỌNG · Nhóm %s: %d chi tiết QUÁ TO so với khổ tấm %g×%g mm "
                            "→ KHÔNG xếp được. Chi tiết: %s. Cần tăng khổ tấm (không thu nhỏ part) "
                            "hoặc tách miếng." % (label, oversize, SW, SH, ten))
        if nearfull:
            ten = ", ".join("“%s” (%.0f×%.0f)" % (o["ten"], o["w"], o["h"]) for o in nearfull[:4])
            warnings.append("ℹ️ Nhóm %s: %d panel TO GẦN BẰNG TẤM (%s) — vẫn cắt được nhưng tự xếp "
                            "chừa biên %gmm nên báo chật. Panel này nên “Dùng mẫu xếp” (vào ngon), "
                            "hoặc đặt Biên = 0 nếu cắt sát mép." % (label, len(nearfull), ten, margin))
        if curved and avg_fill < 0.72 and curved >= max(2, len(parts) // 3):
            warnings.append("⚠️ Trung bình · Nhóm %s: nhiều chi tiết cong/tròn (%d/%d) → xếp khung "
                            "chữ nhật phí tôn, ước chỉ lấp đầy ~%.0f%%/tấm. Nên dùng Deepnest để khít hơn."
                            % (label, curved, len(parts), est_util))
        if st:
            warnings.append("⚠️ Nhẹ · Nhóm %s: có %d nét vụn/dấu tâm nhỏ trên layer cắt → máy sẽ cắt "
                            "thành chấm vụn. Nên xoá các nét vụn này (không ảnh hưởng kích thước)."
                            % (label, st))
        if oe > len(parts) * 4:
            warnings.append("⚠️ Trung bình · Nhóm %s: nhiều đầu nét HỞ (%d) → đường cắt có thể chưa "
                            "kín, có thể KHÔNG lấy được phôi. Kiểm tra lại CAD." % (label, oe))
    if total_parts and all_max < 30:
        warnings.append("⚠️ Toàn bộ chi tiết rất NHỎ (lớn nhất %.1f mm) → có thể bản vẽ KHÔNG phải đơn vị "
                        "mm (cm/inch?). Kiểm tra lại đơn vị." % all_max)
    if all_max > 6000:
        warnings.append("⚠️ Có chi tiết rất LỚN (%.0f mm) → có thể sai đơn vị hoặc bản vẽ theo tỉ lệ." % all_max)
    overall = {"parts": total_parts, "groups": len(parts_by),
               "area_m2": round(total_area / 1e6, 3),
               "max_dim": round(all_max, 1)}
    return {"groups": groups, "warnings": warnings, "overall": overall}


def export_parts(parts_by, out_dir, fold=None):
    """Luu TUNG chi tiet ra 1 file DXF rieng (khoi rieng) trong thu muc con 'ChiTiet'."""
    fold_kw = [k.strip().lower() for k in (fold or DEFAULT_FOLD) if k.strip()]
    d = os.path.join(out_dir, "ChiTiet")
    os.makedirs(d, exist_ok=True)
    n = 0
    for label in sorted(parts_by):
        for idx, p in enumerate(parts_by[label], 1):
            out = ezdxf.new("R2010"); om = out.modelspace()
            _setup_out_layers(out)
            imp = Importer(p["src"], out); blk = out.blocks.new(name="CT")
            imp.import_entities(p["entities"], blk); imp.finalize()
            om.add_blockref("CT", (0, 0))
            for ins in list(om.query("INSERT")):
                for e in ins.explode():
                    _classify_out(e, fold)
            try:
                out.blocks.delete_block("CT", safe=False)
            except Exception:
                pass
            _finalize_doc(out)
            out.saveas(os.path.join(d, "%s_ct_%d.dxf" % (label, idx)))
            n += 1
    return n, d


def _insert_for(theta, px, py, w, h):
    """Diem chen + goc cho block (part chuan hoa [0,w]x[0,h]) -> bbox tai (px,py)."""
    if theta == 90:
        return (px + h, py), 90
    if theta == 180:
        return (px + w, py + h), 180
    if theta == 270:
        return (px, py + w), 270
    return (px, py), 0


def _bake_strip(members, sw, sh, name):
    """'Nuong' 1 DAI xen ke thanh 1 part-dai (entities da dat san). members =
    [(part, theta, dx, dy)]. Tra ve part dict giong part thuong (de rectpack xep)."""
    sd = ezdxf.new("R2010"); sm = sd.modelspace()
    sils = []
    for idx, (part, theta, dx, dy) in enumerate(members):
        bn = "M%d" % idx
        blk = sd.blocks.new(name=bn)
        imp = Importer(part["src"], sd)
        imp.import_entities(part["entities"], blk); imp.finalize()
        ins, rot = _insert_for(theta, dx, dy, part["w"], part["h"])
        ref = sm.add_blockref(bn, ins, dxfattribs={"rotation": rot})
        for _e in ref.explode():
            pass
        try:
            sd.blocks.delete_block(bn, safe=False)
        except Exception:
            pass
        sils.append(part_sil_at(part["sil"], theta, dx, dy))
    sil = unary_union(sils)
    if sil.geom_type != "Polygon":
        sil = sil.convex_hull
    return {"entities": list(sm), "src": sd, "sil": Polygon(sil.exterior),
            "w": sw, "h": sh, "name": name}


def part_sil_at(sil, theta, dx, dy):
    """Silhouette part (goc [0,w]x[0,h]) sau khi dat theo _insert_for(theta,dx,dy)."""
    b = sil.bounds; w = b[2] - b[0]; h = b[3] - b[1]
    if theta == 90:
        s = shp_rotate(sil, 90, origin=(0, 0), use_radians=False)
        s = shp_translate(s, h, 0)
    elif theta == 180:
        s = shp_rotate(sil, 180, origin=(0, 0), use_radians=False)
        s = shp_translate(s, w, h)
    elif theta == 270:
        s = shp_rotate(sil, 270, origin=(0, 0), use_radians=False)
        s = shp_translate(s, 0, w)
    else:
        s = sil
    return shp_translate(s, dx, dy)


# ===== Du lieu MO PHONG XEP (animation tung manh) =====
def _ent_polys(e):
    """Tra ve list cac duong gay khuc [(x,y),...] de VE 1 entity (cho animation)."""
    import math
    t = e.dxftype()
    try:
        if t == "LINE":
            s, en = e.dxf.start, e.dxf.end
            return [[(s.x, s.y), (en.x, en.y)]]
        if t == "LWPOLYLINE":
            pts = [(p[0], p[1]) for p in e.get_points("xy")]
            if getattr(e, "closed", False) and len(pts) > 2:
                pts = pts + [pts[0]]
            return [pts] if len(pts) >= 2 else []
        if t == "CIRCLE":
            c = e.dxf.center; r = e.dxf.radius
            return [[(c.x + r * math.cos(i * math.tau / 48),
                      c.y + r * math.sin(i * math.tau / 48)) for i in range(49)]]
        if t in ("ARC", "ELLIPSE", "SPLINE"):
            try:
                pts = [(p.x, p.y) for p in e.flattening(0.4)]
                return [pts] if len(pts) >= 2 else []
            except Exception:
                if t == "ARC":
                    c = e.dxf.center; r = e.dxf.radius
                    a0 = math.radians(e.dxf.start_angle); a1 = math.radians(e.dxf.end_angle)
                    if a1 <= a0:
                        a1 += math.tau
                    n = max(6, int((a1 - a0) / 0.13))
                    return [[(c.x + r * math.cos(a0 + (a1 - a0) * k / n),
                              c.y + r * math.sin(a0 + (a1 - a0) * k / n)) for k in range(n + 1)]]
    except Exception:
        return []
    return []


def sim_frames(tam_files, fold=None):
    """Doc cac file <label>_tam_N.dxf (1 tam/file) -> KHUNG mo phong xep.
    Moi tam = list 'manh' theo THU TU xep (bang ngang duoi->tren, trai->phai);
    moi manh = {cut:[poly...], chan:[poly...], bbox:(x0,y0,x1,y1), cx, cy}."""
    import ezdxf
    frames = []
    for fp in tam_files:
        try:
            msp = ezdxf.readfile(fp).modelspace()
        except Exception:
            continue
        ents = []
        for e in msp:
            lay = (e.dxf.layer or "")
            if lay == "KHUNG_THAM_KHAO":
                continue
            if e.dxftype() in ("TEXT", "MTEXT", "DIMENSION", "INSERT", "ATTRIB"):
                continue
            if _is_degenerate(e):
                continue
            polys = _ent_polys(e)
            if not polys:
                continue
            pts = [p for poly in polys for p in poly]
            if not pts:
                continue
            xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
            is_chan = (lay == "CHAN_KHONG_CAT") or is_fold_layer(lay, fold)
            ents.append({"polys": polys, "chan": is_chan,
                         "bb": (min(xs), min(ys), max(xs), max(ys))})
        if not ents:
            frames.append({"parts": []})
            continue
        # union-find theo diem dau-mut gan nhau (snap) -> cum lien thong
        parent = list(range(len(ents)))

        def find(i):
            while parent[i] != i:
                parent[i] = parent[parent[i]]; i = parent[i]
            return i

        def uni(a, b):
            ra, rb = find(a), find(b)
            if ra != rb:
                parent[ra] = rb
        grid = {}; SNAP = 2.0
        for idx, en in enumerate(ents):
            for poly in en["polys"]:
                for (x, y) in poly:
                    key = (round(x / SNAP), round(y / SNAP))
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            k = (key[0] + dx, key[1] + dy)
                            if k in grid:
                                uni(idx, grid[k])
                    grid.setdefault(key, idx)
        groups = {}
        for idx in range(len(ents)):
            groups.setdefault(find(idx), []).append(idx)
        clusters = []
        for idxs in groups.values():
            x0 = y0 = 1e18; x1 = y1 = -1e18
            for i in idxs:
                b = ents[i]["bb"]
                x0 = min(x0, b[0]); y0 = min(y0, b[1]); x1 = max(x1, b[2]); y1 = max(y1, b[3])
            clusters.append({"idxs": idxs, "bb": (x0, y0, x1, y1)})
        # gop cum NHO co tam nam TRONG bbox cum LON (lo/chi tiet ben trong 1 part)
        clusters.sort(key=lambda c: (c["bb"][2] - c["bb"][0]) * (c["bb"][3] - c["bb"][1]),
                      reverse=True)
        used = [False] * len(clusters); merged = []
        for i, c in enumerate(clusters):
            if used[i]:
                continue
            grp = list(c["idxs"]); bb = c["bb"]; used[i] = True
            for j in range(i + 1, len(clusters)):
                if used[j]:
                    continue
                d = clusters[j]["bb"]; mx = (d[0] + d[2]) / 2; my = (d[1] + d[3]) / 2
                if bb[0] - 1 <= mx <= bb[2] + 1 and bb[1] - 1 <= my <= bb[3] + 1:
                    grp += clusters[j]["idxs"]; used[j] = True
            merged.append({"idxs": grp, "bb": bb})
        parts = []
        for c in merged:
            cut = []; chan = []
            for i in c["idxs"]:
                (chan if ents[i]["chan"] else cut).extend(ents[i]["polys"])
            b = c["bb"]
            parts.append({"cut": cut, "chan": chan, "bbox": b,
                          "cx": (b[0] + b[2]) / 2, "cy": (b[1] + b[3]) / 2})
        BAND = 140.0
        parts.sort(key=lambda p: (round(p["bbox"][1] / BAND), p["cx"]))
        frames.append({"parts": parts})
    return frames


def _build_strips(insts, gap, usable_w, usable_h):
    """Gom part HINH THANG/NEM giong nhau -> DAI XEN KE (lat 180 luan phien) cho khit
    (hoc cach nhan vien). Tra ve list PART (part don + part-dai da nuong)."""
    groups = defaultdict(list)
    for p in insts:
        sig = (round(p["w"] / 4.0), round(p["h"] / 4.0), round(p["sil"].area / 300.0))
        groups[sig].append(p)
    out = []
    sidx = 0
    for sig, ps in groups.items():
        p0 = ps[0]; w = p0["w"]; h = p0["h"]; sil0 = p0["sil"]
        fill = sil0.area / (w * h) if w * h else 1.0
        # chi gom khi: >=4 part, KHONG day khung (con cho long), vua tam
        if len(ps) < 4 or fill > 0.90 or w > usable_w or h > usable_h:
            out.extend(ps); continue
        # sil sau lat 180 (theo _insert_for, dx=0): tinh PITCH long
        s180 = part_sil_at(sil0, 180, 0, 0)

        def pitch(a, b):
            # hi = w + gap: cho phep mach KHONG long (vd canh thang chap canh thang)
            # van giu duoc khe cat gap (truoc kia kep o w -> mach 180->0 ho 0mm!).
            A = a.buffer(gap / 2.0)
            lo, hi = 0.0, w + gap + 1.0
            for _ in range(26):
                mid = (lo + hi) / 2.0
                if A.intersection(shp_translate(b, mid, 0).buffer(gap / 2.0)).area > 1.0:
                    lo = mid
                else:
                    hi = mid
            return hi
        p_ab = pitch(sil0, s180)          # 0 -> 180
        p_ba = pitch(s180, sil0)          # 180 -> 0
        # khong long duoc (ca hai mach ~ full width) -> de part don (rectpack lo)
        if p_ab >= 0.97 * (w + gap) and p_ba >= 0.97 * (w + gap):
            out.extend(ps); continue
        # xay cac dai
        i = 0; n = len(ps)
        while i < n:
            members = []; x = 0.0; theta = 0
            while i < n:
                members.append((ps[i], theta, x, 0.0)); i += 1
                step = p_ab if theta == 0 else p_ba
                nx = x + step; theta = 180 - theta
                if nx + w > usable_w or len(members) >= 24:
                    break
                x = nx
            # AN TOAN: dai chi hop le khi MOI CAP member cach nhau >= gap (du khe cat).
            # Neu khong (do hinh khong giong het / pitch sai) -> BO dai, dung part roi.
            if len(members) >= 2 and _strip_safe(members, gap):
                sw = max(m[2] for m in members) + w
                sidx += 1
                try:
                    out.append(_bake_strip(members, sw, h, "DAI%d" % sidx))
                except Exception:
                    out.extend(m[0] for m in members)
            else:
                out.extend(m[0] for m in members)
    return out


def _strip_safe(members, gap):
    """Kiem tra 1 DAI: MOI CAP member phai cach nhau >= gap (du khe cat laser).
    Chong nhau (distance 0) hoac qua gan -> KHONG an toan -> BO dai. Chan moi loi
    hinh hoc cua strip (pitch sai, hinh guong cung chu ky, ...)."""
    try:
        sils = [part_sil_at(p["sil"], th, dx, dy) for (p, th, dx, dy) in members]
    except Exception:
        return False
    thr = max(0.5, gap - 0.3)
    nm = len(sils)
    for a in range(nm):
        sa = sils[a]
        for b in range(a + 1, nm):
            try:
                if sa.distance(sils[b]) < thr:
                    return False
            except Exception:
                return False
    return True


def detect_sheet_frames(msp):
    """Tim KHUNG TAM (1250x2500/1500x3000/1220x2440) trong LAYOUT da xep cua nhan vien.
    Khung = LWPOLYLINE 4-5 dinh tren layer cat (KHONG phai chan/dim), bang kho tam.
    Tra ve list (x0,y0,x1,y1,sw,sh), da loai khung inset ve trung."""
    fold_kw = [k.strip().lower() for k in DEFAULT_FOLD if k.strip()]

    def near(w, h, tw, th, t=55):
        return abs(w - tw) < t and abs(h - th) < t
    sizes = [(1250.0, 2500.0), (1500.0, 3000.0), (1220.0, 2440.0)]
    cands = []
    for e in msp:
        if e.dxftype() != "LWPOLYLINE":
            continue
        lay = (e.dxf.layer or "").lower()
        if is_fold_layer(lay) or "dim" in lay or "defpoints" in lay:
            continue                              # bo khung inset ve tren layer chan
        try:
            npts = len(list(e.get_points()))
            if npts not in (4, 5):
                continue
            b = bbox.extents([e]); w = b.extmax.x - b.extmin.x; h = b.extmax.y - b.extmin.y
        except Exception:
            continue
        sw = sh = None
        for tw, th in sizes:
            if near(w, h, tw, th) or near(w, h, th, tw):
                sw, sh = tw, th
                break
        if sw:
            # luu CA id(e) -> trich theo DANH TINH (khong bo part to gan bang kho tam)
            cands.append((b.extmin.x, b.extmin.y, b.extmax.x, b.extmax.y, sw, sh, id(e)))
    # GOP cac khung co TAM gan nhau (cung 1 tam ve 2 lan / khung inset) -> giu khung LON hon.
    # (truoc kia dedup theo luoi 40mm -> khung lech 21-45mm bi tinh thanh 2 tam!)
    out = []
    for c in cands:
        ccx = (c[0] + c[2]) / 2.0; ccy = (c[1] + c[3]) / 2.0
        carea = (c[2] - c[0]) * (c[3] - c[1]); merged = False
        for i, o in enumerate(out):
            if abs(ccx - (o[0] + o[2]) / 2.0) < 150 and abs(ccy - (o[1] + o[3]) / 2.0) < 150:
                if carea > (o[2] - o[0]) * (o[3] - o[1]):
                    out[i] = c                    # giu khung lon hon cho cung 1 tam
                merged = True
                break
        if not merged:
            out.append(c)
    return out


def extract_layout_templates(dxf_path, fold=None):
    """Trich LAYOUT da xep cua nhan vien -> list TAM MAU (chup NGUYEN tung tam,
    verbatim). Moi tam: {thickness, material, w, h, n_ent, dxf(chuoi DXF goc o (0,0))}."""
    import io
    fold_kw = [k.strip().lower() for k in (fold or DEFAULT_FOLD) if k.strip()]
    src = ezdxf.readfile(dxf_path); msp = src.modelspace()
    # nhan 'X MM' -> nhom do day (gan theo vung 2D)
    labels = []
    for e in msp:
        if e.dxftype() in ("TEXT", "MTEXT"):
            try:
                t = e.plain_text() if e.dxftype() == "MTEXT" else e.dxf.text
            except Exception:
                continue
            m = re.search(r"([\d.]+)\s*MM", (t or "").upper())
            if m:
                try:
                    asc = _strip_accents((t or "").upper())
                    mat = "INOX" if ("INOX" in asc or "SUS" in asc) else "SAT"
                    labels.append((e.dxf.insert.x, e.dxf.insert.y, m.group(1), mat))
                except Exception:
                    pass
    frames = detect_sheet_frames(msp)
    frame_eids = set(fr[6] for fr in frames if len(fr) > 6)

    def grp(fr):
        x0, y0, x1, y1 = fr[0], fr[1], fr[2], fr[3]
        cx = (x0 + x1) / 2; cy = (y0 + y1) / 2
        # 1) uu tien nhan 'X MM' NAM TRONG khung -> dung do day cua chinh tam do
        for lx, ly, th, mat in labels:
            if x0 <= lx <= x1 and y0 <= ly <= y1:
                return (th, mat)
        # 2) khong co nhan trong khung -> nhan gan nhat (layout that: nhan o lo, moi
        #    khoi do day la 1 vung -> gan nhat van dung). KHONG dat cap chat keo None.
        best = None
        for lx, ly, th, mat in labels:
            dd = math.hypot(lx - cx, ly - cy)
            if best is None or dd < best[0]:
                best = (dd, th, mat)
        return (best[1], best[2]) if best else (None, "SAT")

    out = []
    for fr in frames:
        x0, y0, x1, y1, sw, sh = fr[0], fr[1], fr[2], fr[3], fr[4], fr[5]
        th, mat = grp(fr)
        keep = []
        for e in msp:
            lay = (e.dxf.layer or "").lower()
            if e.dxftype() in ("DIMENSION", "TEXT", "MTEXT"):
                continue
            if "defpoints" in lay or lay.startswith("dim"):
                continue
            if id(e) in frame_eids:
                continue                          # chinh KHUNG tam (theo danh tinh, KHONG theo kich thuoc)
            if _is_degenerate(e):
                continue                          # net suy bien (~0) -> bo, tranh cat cham vun
            try:
                b = bbox.extents([e]); cx = (b.extmin.x + b.extmax.x) / 2
                cy = (b.extmin.y + b.extmax.y) / 2
            except Exception:
                continue
            # bien 6mm: giu ca chi tiet nho nam sat MEP khung (vd notch goc tron lo ra)
            if not (x0 - 6 < cx < x1 + 6 and y0 - 6 < cy < y1 + 6):
                continue                          # tam khac
            keep.append(e)
        nd = ezdxf.new("R2010"); nm = nd.modelspace()
        _setup_out_layers(nd)
        imp = Importer(src, nd); imp.import_entities(keep, nm); imp.finalize()
        for e in list(nm):
            try:
                e.translate(-x0, -y0, 0)
                # khung vien TRUNG (LWPOLYLINE 4-5 dinh ~ kho tam) -> reference, KHONG cat
                sheet_like = False
                if e.dxftype() == "LWPOLYLINE":
                    try:
                        npt = len(list(e.get_points()))
                        if npt in (4, 5):
                            bb = bbox.extents([e]); ww = bb.extmax.x - bb.extmin.x; hh = bb.extmax.y - bb.extmin.y
                            sheet_like = ((abs(ww - sw) < 15 and abs(hh - sh) < 15) or
                                          (abs(ww - sh) < 15 and abs(hh - sw) < 15))
                    except Exception:
                        sheet_like = False
                if sheet_like:
                    e.dxf.layer = "KHUNG_THAM_KHAO"      # khung vien trung -> KHONG cat
                    e.dxf.color = 256
                else:
                    _classify_out(e, fold)
            except Exception:
                pass
        nm.add_lwpolyline([(0, 0), (sw, 0), (sw, sh), (0, sh), (0, 0)],
                          dxfattribs={"layer": "KHUNG_THAM_KHAO"})
        buf = io.StringIO(); nd.write(buf)
        out.append(dict(thickness=th, material=mat, w=sw, h=sh,
                        n_ent=len(keep), dxf=buf.getvalue()))
    return out


def apply_template(sheets, out_dir, repeat=1, progress=None):
    """Xuat MAU XEP (cac tam da chup verbatim) ra file cut-ready = layout nhan vien.
    sheets = list {thickness,material,w,h,dxf}. repeat = so lan lap moi tam.
    Tra ve report giong nest_and_write (de GUI dung chung luong xuat/preview)."""
    import io
    os.makedirs(out_dir, exist_ok=True)
    from collections import defaultdict
    groups = defaultdict(list)
    for si, s in enumerate(sheets):
        th = s.get("thickness"); mat = s.get("material") or "SAT"
        if th:
            label = "%s_%smm" % (mat, th)
        else:                                     # do day CHUA RO -> moi tam 1 nhom rieng,
            label = "%s_CHUARO_tam%d" % (mat, si + 1)   # KHONG gop lan do day khac nhau
        groups[label].append(s)
    report = {"groups": [], "total_sheets": 0, "all_ok": True, "is_template": True}
    for label in sorted(groups):
        gs = groups[label]
        idx = 0; clen = 0.0; pier = 0; parea = 0.0
        sw = gs[0].get("w", 1250.0); sh = gs[0].get("h", 2500.0)
        for s in gs:
            for _ in range(max(1, int(repeat))):
                idx += 1
                with open(os.path.join(out_dir, "%s_tam_%d.dxf" % (label, idx)),
                          "w", encoding="utf-8") as f:
                    f.write(s["dxf"])
                # do met cat + diem moi tu than tam (cho bang chi phi)
                try:
                    dd = ezdxf.read(io.StringIO(s["dxf"]))
                    ents = [e for e in dd.modelspace()
                            if (e.dxf.layer or "") != "KHUNG_THAM_KHAO"]
                    L, n = cut_metrics(ents)
                    clen += L; pier += n
                except Exception:
                    pass
        nb = idx
        report["total_sheets"] += nb
        report["groups"].append({
            "label": label, "sheets": nb, "util": 0, "min_gap": 0,
            "ok": True, "overlap": 0, "out_of_bound": 0, "parts": 0,
            "unplaced": 0, "cut_m": round(clen / 1000.0, 2), "pierces": pier,
            "parea_m2": round(parea / 1e6, 4), "sheet_wh": [sw, sh],
        })
        if progress:
            progress("Da xuat mau nhom %s: %d tam" % (label, nb))
    return report


def serialize_part_text(part, fold=None):
    """Tuan tu hoa 1 chi tiet thanh chuoi DXF (de luu vao thu vien)."""
    import io
    fold_kw = [k.strip().lower() for k in (fold or DEFAULT_FOLD) if k.strip()]
    out = ezdxf.new("R2010"); om = out.modelspace()
    _setup_out_layers(out)
    imp = Importer(part["src"], out); blk = out.blocks.new(name="CT")
    imp.import_entities(part["entities"], blk); imp.finalize()
    om.add_blockref("CT", (0, 0))
    for ins in list(om.query("INSERT")):
        for e in ins.explode():
            _classify_out(e, fold)
    try:
        out.blocks.delete_block("CT", safe=False)
    except Exception:
        pass
    s = io.StringIO(); out.write(s); return s.getvalue()


def load_part_from_text(txt, name="P"):
    """Doc lai 1 chi tiet tu chuoi DXF -> part dict (de xep tu thu vien)."""
    import io
    doc = ezdxf.read(io.StringIO(txt)); msp = doc.modelspace()
    ents = [e for e in msp if e.dxftype() != "INSERT"]
    if not ents:
        return None
    xs = []; ys = []
    for e in ents:
        try:
            b = bbox.extents([e])
            if b.has_data:
                xs += [b.extmin.x, b.extmax.x]; ys += [b.extmin.y, b.extmax.y]
        except Exception:
            pass
    if not xs:
        return None
    x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
    sil = _silhouette(ents, (x0, y0, x1, y1))
    sx0, sy0, sx1, sy1 = sil.bounds
    sil = shp_translate(sil, -sx0, -sy0)
    for e in ents:
        try:
            e.translate(-sx0, -sy0, 0)
        except Exception:
            pass
    return dict(entities=ents, sil=sil, w=sx1 - sx0, h=sy1 - sy0,
                name=name, src=doc)


def run_nest(dxf_path, out_dir, sheet=(1250.0, 2500.0), gap=3.0, margin=3.0,
             sets=1, group_labels=None, fold=None, progress=None):
    """Xep 1 file va xuat. Tra ve dict bao cao."""
    parts_by = extract_parts(dxf_path, group_labels)
    if not parts_by:
        raise RuntimeError("Khong tach duoc chi tiet nao. Kiem tra file co net kin, "
                           "don vi mm.")
    return nest_and_write(parts_by, out_dir, sheet, gap, margin, sets, fold, progress)


def run_nest_multi(file_label_pairs, out_dir, sheet=(1250.0, 2500.0), gap=3.0,
                   margin=3.0, sets=1, fold=None, progress=None):
    """Gop NHIEU file xep chung. file_label_pairs: [(dxf_path, group_labels), ...].
    Cac chi tiet cung nhan (vd SAT_2mm) tu cac file khac nhau se xep chung tam."""
    pbs = []
    for i, (path, labels) in enumerate(file_label_pairs):
        if progress:
            progress("Doc file %d/%d..." % (i + 1, len(file_label_pairs)))
        pbs.append(extract_parts(path, labels, prefix="F%d" % i))
    parts_by = _merge_parts_by(pbs)
    if not parts_by:
        raise RuntimeError("Khong tach duoc chi tiet nao tu cac file.")
    return nest_and_write(parts_by, out_dir, sheet, gap, margin, sets, fold, progress)


def nest_and_write(parts_by, out_dir, sheet=(1250.0, 2500.0), gap=3.0, margin=3.0,
                   sets=1, fold=None, progress=None):
    """Xep cac chi tiet (da gom theo nhan) len tam va xuat file. parts_by: {nhan:[parts]}.
    Moi part co 'src','entities','sil','w','h','name'."""
    SW, SH = sheet
    fold_kw = [k.strip().lower() for k in (fold or DEFAULT_FOLD) if k.strip()]
    os.makedirs(out_dir, exist_ok=True)

    def is_fold(layer):
        return is_fold_layer(layer, fold)

    def insert_for(theta, px, py, w, h):
        if theta == 90:
            return (px + h, py), 90
        return (px, py), 0

    BW = int(SW - 2 * margin + gap); BH = int(SH - 2 * margin + gap)
    algos = [rectpack.MaxRectsBssf, rectpack.MaxRectsBaf, rectpack.MaxRectsBlsf,
             rectpack.SkylineMwfl, rectpack.SkylineBl, rectpack.GuillotineBssfSas]
    sorts = [rectpack.SORT_AREA, rectpack.SORT_PERI, rectpack.SORT_LSIDE,
             rectpack.SORT_SSIDE]

    def pack_units(units):
        """Xep mot tap PART (part don hoac part-DAI da nuong) -> (sheets, unplaced)."""
        meta = {}; rects = []
        for i, p in enumerate(units):
            w = int(math.ceil(p["w"] + gap)); h = int(math.ceil(p["h"] + gap))
            meta[i] = (p, w, h); rects.append((i, w, h))
        parea = sum(pw * ph for _, pw, ph in rects)

        def run(algo, sort):
            pk = rectpack.newPacker(mode=rectpack.PackingMode.Offline,
                                    pack_algo=algo, sort_algo=sort, rotation=True)
            for i, w, h in rects:
                pk.add_rect(w, h, rid=i)
            pk.add_bin(BW, BH, count=len(rects) + 2)
            pk.pack()
            return pk.rect_list(), len(pk)

        best = None
        for a in algos:
            for s in sorts:
                try:
                    rl, nb = run(a, s)
                except Exception:
                    continue
                if len(rl) < len(rects):
                    continue
                fill = parea / (nb * BW * BH) if nb else 0
                score = (nb, -fill)
                if best is None or score < best[0]:
                    best = (score, rl, nb)
        if best is None:
            rl, nb = run(rectpack.MaxRectsBssf, rectpack.SORT_AREA)
            best = ((nb, 0), rl, nb)
        rect_list = best[1]
        smap = defaultdict(list); placed = set()
        for (b, x, y, w, h, rid) in rect_list:
            placed.add(rid)
            p, pw, ph = meta[rid]
            rotated = not (abs(w - pw) < 1.5 and abs(h - ph) < 1.5)
            smap[b].append(dict(part=p, theta=90 if rotated else 0,
                                px=x + margin, py=y + margin))
        unplaced = [meta[i][0]["name"] for i in range(len(units)) if i not in placed]
        return [smap[b] for b in sorted(smap)], unplaced

    def nest_group(parts):
        insts = [p for p in parts for _ in range(sets)]
        plain_sheets, plain_un = pack_units(insts)
        # B4: gom part hinh thang giong nhau -> DAI XEN KE (hoc cach nhan vien),
        # so it tam hon thi dung; KHONG bao gio te hon rectpack.
        try:
            units = _build_strips(insts, gap, SW - 2 * margin, SH - 2 * margin)
            if len(units) < len(insts):       # co tao duoc dai
                s_sheets, s_un = pack_units(units)
                if len(s_un) <= len(plain_un) and len(s_sheets) < len(plain_sheets):
                    return s_sheets, s_un
        except Exception:
            pass
        return plain_sheets, plain_un

    def write_sheet(pls, path):
        out = ezdxf.new("R2010"); om = out.modelspace()
        _setup_out_layers(out)
        importers = {}; blk = {}   # 1 Importer cho moi doc nguon (ho tro nhieu file)
        for pl in pls:
            nm = pl["part"]["name"]
            if nm in blk:
                continue
            psrc = pl["part"]["src"]
            imp = importers.get(id(psrc))
            if imp is None:
                imp = Importer(psrc, out); importers[id(psrc)] = imp
            bn = "PART_" + nm; b = out.blocks.new(name=bn)
            imp.import_entities(pl["part"]["entities"], b); blk[nm] = bn
        for imp in importers.values():
            imp.finalize()
        for pl in pls:
            p = pl["part"]
            if "ang" in pl:                       # xep hinh that (goc bat ky)
                ins = (pl["ix"], pl["iy"]); rot = pl["ang"]
            else:                                 # xep khung chu nhat (0/90)
                ins, rot = insert_for(pl["theta"], pl["px"], pl["py"], p["w"], p["h"])
            om.add_blockref(blk[p["name"]], ins, dxfattribs={"rotation": rot})
        for ins in list(om.query("INSERT")):
            for e in ins.explode():
                _classify_out(e, fold)
        for nm in list(blk.values()):
            try:
                out.blocks.delete_block(nm, safe=False)
            except Exception:
                pass
        om.add_lwpolyline([(0, 0), (SW, 0), (SW, SH), (0, SH), (0, 0)],
                          dxfattribs={"layer": "KHUNG_THAM_KHAO"})
        _finalize_doc(out)
        out.saveas(path)

    def placed_sil(pl):
        if "ang" in pl:
            return pl["sil"]
        p = pl["part"]
        ins, rot = insert_for(pl["theta"], pl["px"], pl["py"], p["w"], p["h"])
        s = shp_rotate(p["sil"], pl["theta"], origin=(0, 0), use_radians=False)
        return shp_translate(s, ins[0], ins[1])

    report = {"sheet": [SW, SH], "gap": gap, "margin": margin, "sets": sets,
              "groups": [], "total_sheets": 0, "all_ok": True}
    for grp in sorted(parts_by):
        if progress:
            progress("Dang xep nhom %s..." % grp)
        parts = parts_by[grp]
        sheets, unplaced = nest_group(parts)
        nb = len(sheets)
        report["total_sheets"] += nb
        ov = 0; oob = 0; mg = 9e9
        for s, pls in enumerate(sheets):
            sils = [placed_sil(pl) for pl in pls]
            for i in range(len(sils)):
                bx = sils[i].bounds
                if bx[0] < -1 or bx[1] < -1 or bx[2] > SW + 1 or bx[3] > SH + 1:
                    oob += 1
                for j in range(i + 1, len(sils)):
                    if sils[i].intersection(sils[j]).area > 1:
                        ov += 1
                    mg = min(mg, sils[i].distance(sils[j]))
            write_sheet(pls, os.path.join(out_dir, "%s_tam_%d.dxf" % (grp, s + 1)))
        ok = (ov == 0 and oob == 0 and not unplaced)
        report["all_ok"] = report["all_ok"] and ok
        parea = sum(p["sil"].area for p in parts) * sets
        util = 100.0 * parea / (nb * SW * SH) if nb else 0
        clen = 0.0; pier = 0
        for p in parts:
            L, n = cut_metrics(p["entities"], is_fold)
            clen += L; pier += n
        clen *= sets; pier *= sets
        report["groups"].append({
            "label": grp, "sheets": nb, "util": round(util, 1),
            "min_gap": round(mg if mg < 9e9 else 0, 1),
            "ok": ok, "overlap": ov, "out_of_bound": oob,
            "parts": len(parts),
            "unplaced": len(unplaced),
            "cut_m": round(clen / 1000.0, 2),     # tong met cat
            "pierces": pier,                       # so diem moi
            "parea_m2": round(parea / 1e6, 4),     # dien tich phoi (m2)
        })
    return report


def merge_by_label(out_dir, labels, sheet=(1250.0, 2500.0), gapx=150.0):
    """Gop cac tam cung 1 nhan thanh 1 file de cat 1 luot. Tra ve list duong dan."""
    import glob
    SW, SH = sheet
    made = []
    for label in labels:
        files = sorted(glob.glob(os.path.join(out_dir, "%s_tam_*.dxf" % label)),
                       key=lambda f: int(re.search(r"_tam_(\d+)\.dxf$", f).group(1)))
        if not files:
            continue
        out = ezdxf.new("R2010"); om = out.modelspace()
        _setup_out_layers(out)
        run_x = 0.0
        for f in files:
            sd = ezdxf.readfile(f); sm = sd.modelspace()
            ents = list(sm)
            # do rong THUC cua tam nay (offset CHAY) -> khong chong khi cac tam khac kho
            try:
                bb = bbox.extents(ents); fw = bb.extmax.x - bb.extmin.x
            except Exception:
                fw = SW
            for e in ents:
                try:
                    e.translate(run_x, 0, 0)
                except Exception:
                    pass
            imp = Importer(sd, out)
            imp.import_entities(ents, om)
            imp.finalize()
            run_x += fw + gapx
        path = os.path.join(out_dir, "%s_GOP.dxf" % label)
        _finalize_doc(out)
        out.saveas(path)
        made.append(path)
    return made
