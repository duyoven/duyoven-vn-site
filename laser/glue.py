# -*- coding: utf-8 -*-
"""glue.py — cau noi giua web (JS) va engine (core/render) chay trong Pyodide.
Moi ham nhan/tra du lieu don gian; tra ve JSON string (JS JSON.parse)."""
import json, base64, gzip, tempfile, os
import core, render


def do_analyze(dxf_text, sw, sh):
    d = tempfile.mkdtemp(); p = os.path.join(d, "a.dxf")
    open(p, "w", encoding="utf-8").write(dxf_text)
    a = core.analyze_drawing(p, sheet=(float(sw), float(sh)))
    return json.dumps(a)


def do_nest(dxf_text, sw, sh, gap, margin):
    sw = float(sw); sh = float(sh)
    d = tempfile.mkdtemp(); p = os.path.join(d, "in.dxf")
    open(p, "w", encoding="utf-8").write(dxf_text)
    pb = core.parts_from_file(p, sheet=(sw, sh))
    a = core.analyze_drawing(p, sheet=(sw, sh))
    if sum(len(v) for v in pb.values()) == 0:
        return json.dumps({"ok": False, "sheets": 0, "analysis": a, "files": []})
    out = tempfile.mkdtemp()
    rep = core.nest_order([(pb, 1, "Don")], out, sheet=(sw, sh),
                          gap=float(gap), margin=float(margin))
    labels = sorted(set(g["label"] for g in rep.get("groups", [])))
    made = core.merge_by_label(out, labels, sheet=(sw, sh))
    files = []
    for f in made:
        files.append({"name": os.path.basename(f),
                      "dxf": open(f, encoding="utf-8").read()})
    return json.dumps({"ok": rep.get("all_ok", False),
                       "sheets": rep.get("total_sheets", 0),
                       "analysis": a, "files": files})


def do_prims(dxf_text):
    prims, bbox = render.cad_primitives(dxf_text)
    return json.dumps({"prims": prims, "bbox": list(bbox)})


def zip_dxf(dxf_text):
    return json.dumps(base64.b64encode(gzip.compress(dxf_text.encode("utf-8"))).decode("ascii"))


def unzip_dxf(gz_b64):
    return json.dumps(gzip.decompress(base64.b64decode(gz_b64)).decode("utf-8"))


_FN = {"do_nest": do_nest, "do_analyze": do_analyze, "do_prims": do_prims,
       "zip_dxf": zip_dxf, "unzip_dxf": unzip_dxf}


def dispatch(name, *args):
    return _FN[name](*args)
