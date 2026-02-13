"""Pytest fixtures: in-memory DB, test client, API prefix."""
import os
import sys

import pytest
from fastapi.testclient import TestClient

# Shared in-memory SQLite so all connections see the same tables (set before app imports)
os.environ["DATABASE_URL"] = "sqlite:///file:testdb?mode=memory&cache=shared&uri=true"

from app.main import app
from app.core.database import init_db

# Ensure app package is on path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


@pytest.fixture(scope="function")
def client():
    """Test client with in-memory DB; tables created per test run."""
    init_db()
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="function")
def api():
    """API prefix from config (e.g. /api/v1)."""
    from app.core.config import settings
    return settings.api_prefix
