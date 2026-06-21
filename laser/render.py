# -*- coding: utf-8 -*-
"""render.py — Ve anh xem truoc (PNG) tu file DXF da xep. Do=cat, xanh=chan."""
import os


def cad_primitives(dxf_text, max_sag=0.5):
    """Tach DXF -> list net ve cho VIEWER KIEU AUTOCAD: moi net {pts:[(x,y)..], color:'#rrggbb'
    (mau ACI THAT theo entity/layer), dashed:bool}. Da bung INSERT, lam phang ARC/CIRCLE/ELLIPSE/
    SPLINE/LWPOLYLINE. Toa do mm (y len tren). Tra ve (prims, (minx,miny,maxx,maxy))."""
    import io
    import ezdxf
    from ezdxf import path as epath, colors as ezc
    try:
        doc = ezdxf.read(io.StringIO(dxf_text))
    except Exception:
        # DXF co binary tag (ACIS/Embedded Object) lam tagger pure-python (Pyodide) vuong
        # -> recover mode (chiu loi, bo qua tag hong) de viewer doc duoc ban ve THAT (vd lo 65)
        from ezdxf import recover
        try:
            raw = dxf_text.encode("utf-8", "replace")
        except Exception:
            raw = dxf_text
        doc, _auditor = recover.read(io.BytesIO(raw))
    msp = doc.modelspace()

    def _aci(e):
        try:
            aci = e.dxf.color
        except Exception:
            aci = 256
        if aci in (0, 256, None):                 # BYLAYER / BYBLOCK -> mau layer
            try:
                lay = doc.layers.get(e.dxf.layer)
                lc = lay.dxf.color
                aci = lc if lc not in (0, 256, None) else 7
            except Exception:
                aci = 7
        try:
            aci = abs(int(aci)) or 7
        except Exception:
            aci = 7
        return aci

    def rgb(e):
        # true-color (rgb) neu co
        try:
            if e.dxf.hasattr("true_color") and e.rgb:
                r, g, b = e.rgb
                return "#%02x%02x%02x" % (r, g, b)
        except Exception:
            pass
        aci = _aci(e)
        try:
            r, g, b = ezc.aci2rgb(aci)
        except Exception:
            r, g, b = (255, 255, 255)
        if (r, g, b) == (0, 0, 0):                # ACI 7 tren nen den = trang
            r, g, b = (255, 255, 255)
        return "#%02x%02x%02x" % (r, g, b)

    def dashed(e):
        try:
            lt = (e.dxf.linetype or "BYLAYER").upper()
        except Exception:
            lt = "BYLAYER"
        if lt in ("BYLAYER", "BYBLOCK", "", "CONTINUOUS"):
            try:
                lt = (doc.layers.get(e.dxf.layer).dxf.linetype or "").upper()
            except Exception:
                lt = ""
        return any(k in lt for k in ("HIDDEN", "DASH", "DOT", "CENTER", "PHANTOM", "DIVIDE"))

    def emit(e, out):
        try:
            pts = [(float(v.x), float(v.y)) for v in epath.make_path(e).flattening(max_sag)]
        except Exception:
            pts = None
        if not pts:
            t = e.dxftype()
            try:
                if t == "LINE":
                    pts = [(e.dxf.start.x, e.dxf.start.y), (e.dxf.end.x, e.dxf.end.y)]
                elif t in ("TEXT", "MTEXT", "ATTRIB"):
                    return
                else:
                    return
            except Exception:
                return
        if len(pts) >= 2:
            out.append({"pts": pts, "color": rgb(e), "dashed": dashed(e)})

    prims = []
    for e in msp:
        if e.dxftype() == "INSERT":
            try:
                for ve in e.virtual_entities():
                    emit(ve, prims)
            except Exception:
                pass
        else:
            emit(e, prims)
    xs = [x for p in prims for (x, _y) in p["pts"]]
    ys = [y for p in prims for (_x, y) in p["pts"]]
    if xs and ys:
        bbox = (min(xs), min(ys), max(xs), max(ys))
    else:
        bbox = (0.0, 0.0, 1.0, 1.0)
    return prims, bbox


def render_view(dxf_path, png_path, px=2600):
    """Ve TOAN BO ban ve ra PNG do phan giai cao, NET DAM DEU de xem ro
    (khong can AutoCAD). px = canh DAI cua anh (giu ti le)."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import ezdxf
    from ezdxf.addons.drawing import RenderContext, Frontend, config
    from ezdxf.addons.drawing.matplotlib import MatplotlibBackend
    from ezdxf.addons.drawing.config import (LineweightPolicy, LinePolicy,
                                             BackgroundPolicy)
    doc = ezdxf.readfile(dxf_path)
    cfg = config.Configuration().with_changes(
        lineweight_policy=LineweightPolicy.RELATIVE_FIXED,   # moi net DEU nhau, ro
        min_lineweight=11,
        line_policy=LinePolicy.SOLID,                        # khong net dut bi mat
        background_policy=BackgroundPolicy.WHITE,
    )
    fig = plt.figure(dpi=100)
    ax = fig.add_axes([0, 0, 1, 1]); ax.set_facecolor("white"); ax.axis("off")
    try:
        Frontend(RenderContext(doc), MatplotlibBackend(ax), config=cfg).draw_layout(
            doc.modelspace(), finalize=True)
        ax.set_aspect("equal")
        x0, x1 = ax.get_xlim(); y0, y1 = ax.get_ylim()
        w = max(1.0, x1 - x0); h = max(1.0, y1 - y0)
        # canh dai = px, canh con lai theo ti le
        if w >= h:
            iw = px / 100.0; ih = max(2.0, iw * h / w)
        else:
            ih = px / 100.0; iw = max(2.0, ih * w / h)
        fig.set_size_inches(iw, ih)
        fig.savefig(png_path, dpi=100, facecolor="white")
    finally:
        plt.close(fig)
    return png_path


def preview_png(dxf_path, png_path=None, title=None, wide=False):
    # import matplotlib O DAY (khong phai luc khoi dong) -> app mo nhanh, khong do
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import ezdxf
    from ezdxf.addons.drawing import RenderContext, Frontend
    from ezdxf.addons.drawing.matplotlib import MatplotlibBackend
    png_path = png_path or os.path.splitext(dxf_path)[0] + "_xem.png"
    doc = ezdxf.readfile(dxf_path)
    figsize = (14, 5) if wide else (8.27, 11.69)
    fig = plt.figure(figsize=figsize)
    ax = fig.add_axes([0.03, 0.04, 0.94, 0.92]); ax.set_facecolor("white")
    Frontend(RenderContext(doc), MatplotlibBackend(ax)).draw_layout(
        doc.modelspace(), finalize=True)
    ax.set_aspect("equal")
    ax.set_title((title or os.path.basename(dxf_path)) + "  (do=cat, xanh=chan)")
    fig.savefig(png_path, dpi=90, facecolor="white")
    plt.close(fig)
    return png_path
