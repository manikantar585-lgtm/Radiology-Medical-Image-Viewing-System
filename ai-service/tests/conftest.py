import sys
from pathlib import Path

# The service modules use flat imports (e.g. `from router import router`), so
# make the service directory importable when pytest runs from anywhere.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
