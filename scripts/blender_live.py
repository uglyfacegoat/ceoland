"""Use the installed Blender MCP client to work in the open Blender instance."""
import argparse
import json
import os
from pathlib import Path
import sys

os.environ["BLENDER_MCP_DISABLE_TELEMETRY"] = "true"
from blender_mcp.server import BlenderConnection

sys.stdout.reconfigure(encoding="utf-8")
parser = argparse.ArgumentParser()
parser.add_argument("--script", type=Path)
parser.add_argument("--expression")
parser.add_argument("--screenshot", type=Path)
options = parser.parse_args()
connection = BlenderConnection("127.0.0.1", 9876)
try:
    if options.script:
        code = "import runpy; runpy.run_path(" + repr(str(options.script.resolve())) + ", run_name='__main__')"
        result = connection.send_command("execute_code", {"code": code})
    elif options.expression:
        result = connection.send_command("execute_code", {"code": options.expression})
    elif options.screenshot:
        result = connection.send_command("get_viewport_screenshot", {"filepath": str(options.screenshot.resolve()), "max_size": 1500})
    else:
        result = connection.send_command("get_scene_info")
    print(json.dumps(result, ensure_ascii=False))
finally:
    connection.disconnect()
