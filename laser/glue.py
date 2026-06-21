# -*- coding: utf-8 -*-
"""glue.py — cau noi web (JS) <-> engine (core/render) chay trong Pyodide. Tra ve JSON string."""
import json, base64, gzip, tempfile, os
import core, render

DENS = {"INOX": 7.93, "SAT": 7.85}


def _dxf_to_file(dxf_text):
    d = tempfile.mkdtemp(); p = os.path.join(d, "x.dxf")
    open(p, "w", encoding="utf-8").write(dxf_text)
    return p


def _result(rep, a, made):
    files = [{"name": os.path.basename(f), "dxf": open(f, encoding="utf-8").read()} for f in made]
    groups = [{"label": g.get("label"), "sheets": g.get("sheets", 0),
               "cut_m": g.get("cut_m", 0), "pierce": g.get("pierces", 0),
               "util": g.get("util", 0)} for g in rep.get("groups", [])]
    return {"ok": rep.get("all_ok", False), "sheets": rep.get("total_sheets", 0),
            "analysis": a, "groups": groups, "files": files}


def do_analyze(dxf_text, sw, sh):
    a = core.analyze_drawing(_dxf_to_file(dxf_text), sheet=(float(sw), float(sh)))
    return json.dumps(a)


def do_nest(dxf_text, sw, sh, gap, margin):
    sw = float(sw); sh = float(sh)
    p = _dxf_to_file(dxf_text)
    pb = core.parts_from_file(p, sheet=(sw, sh))
    a = core.analyze_drawing(p, sheet=(sw, sh))
    if sum(len(v) for v in pb.values()) == 0:
        return json.dumps({"ok": False, "sheets": 0, "analysis": a, "groups": [], "files": []})
    out = tempfile.mkdtemp()
    rep = core.nest_order([(pb, 1, "Don")], out, sheet=(sw, sh), gap=float(gap), margin=float(margin))
    made = core.merge_by_label(out, sorted(set(g["label"] for g in rep.get("groups", []))), sheet=(sw, sh))
    return json.dumps(_result(rep, a, made))


def do_order(items_json, sw, sh, gap, margin):
    """items = [{dxf, qty, name}] -> xep CHUNG (don hang nhieu lo)."""
    sw = float(sw); sh = float(sh)
    items = json.loads(items_json) if isinstance(items_json, str) else items_json
    eng = []; total_parts = 0; total_w = 0.0; mat_agg = {}
    for it in items:
        p = _dxf_to_file(it["dxf"]); qty = int(it.get("qty", 1))
        pb = core.parts_from_file(p, sheet=(sw, sh))
        if sum(len(v) for v in pb.values()) == 0:
            continue
        eng.append((pb, qty, it.get("name", "Lo")))
        a = core.analyze_drawing(p, sheet=(sw, sh))
        total_parts += a["n_parts"] * qty
        for m in a["materials"]:
            k = (m["material"], m["thickness"])
            mat_agg.setdefault(k, {"material": m["material"], "thickness": m["thickness"], "count": 0, "weight_kg": 0.0})
            mat_agg[k]["count"] += m["count"] * qty
            mat_agg[k]["weight_kg"] += m["weight_kg"] * qty
        total_w += a["weight_kg"] * qty
    if not eng:
        return json.dumps({"ok": False, "sheets": 0, "groups": [], "files": [],
                           "analysis": {"n_parts": 0, "weight_kg": 0, "materials": []}})
    out = tempfile.mkdtemp()
    rep = core.nest_order(eng, out, sheet=(sw, sh), gap=float(gap), margin=float(margin))
    made = core.merge_by_label(out, sorted(set(g["label"] for g in rep.get("groups", []))), sheet=(sw, sh))
    a = {"n_parts": total_parts, "weight_kg": round(total_w, 2),
         "n_types": len(mat_agg),
         "materials": [{"material": v["material"], "thickness": v["thickness"],
                        "count": v["count"], "weight_kg": round(v["weight_kg"], 2)}
                       for v in mat_agg.values()]}
    return json.dumps(_result(rep, a, made))


def do_prims(dxf_text):
    prims, bbox = render.cad_primitives(dxf_text)
    return json.dumps({"prims": prims, "bbox": list(bbox)})


def zip_dxf(dxf_text):
    return json.dumps(base64.b64encode(gzip.compress(dxf_text.encode("utf-8"))).decode("ascii"))


def unzip_dxf(gz_b64):
    return json.dumps(gzip.decompress(base64.b64decode(gz_b64)).decode("utf-8"))


_FN = {"do_nest": do_nest, "do_order": do_order, "do_analyze": do_analyze,
       "do_prims": do_prims, "zip_dxf": zip_dxf, "unzip_dxf": unzip_dxf}


def dispatch(name, *args):
    return _FN[name](*args)
