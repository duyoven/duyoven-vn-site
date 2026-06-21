# -*- coding: utf-8 -*-
"""glue.py — BAN WEB XEM/QUAN LY (iPad/may tinh). CHI dung ezdxf (cad_primitives) + gzip —
KHONG import core, KHONG dung shapely/GEOS -> nhe + KHONG BAO GIO SAP. Phan XEP chay tren may tinh."""
import json, base64, gzip
import render   # render.cad_primitives chi dung ezdxf, khong shapely


def do_prims(dxf_text):
    prims, bbox = render.cad_primitives(dxf_text)
    return json.dumps({"prims": prims, "bbox": list(bbox)})


def unzip_dxf(b):
    return json.dumps(gzip.decompress(base64.b64decode(b)).decode("utf-8"))


def dispatch(name, *args):
    return {"do_prims": do_prims, "unzip_dxf": unzip_dxf}[name](*args)
