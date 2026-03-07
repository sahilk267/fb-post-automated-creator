import pytest
import os
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import init_db
from app.core.config import settings

@pytest.fixture(scope="module")
def client():
    # Ensure test DB
    os.environ["DATABASE_URL"] = "sqlite:///file:test_premium?mode=memory&cache=shared&uri=true"
    init_db()
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="module")
def auth_token(client):
    """Fixture to create a user and get an auth token."""
    # Register
    register_payload = {
        "email": "test@example.com",
        "password": "testpassword123",
        "username": "testuser",
        "full_name": "Test User"
    }
    r_resp = client.post(f"{settings.api_prefix}/auth/signup", json=register_payload)
    if r_resp.status_code != 200:
        print(f"Signup failed: {r_resp.text}")
    
    # Login
    login_data = {
        "username": "testuser",
        "password": "testpassword123"
    }
    resp = client.post(f"{settings.api_prefix}/auth/token", data=login_data)
    # Wait, the route in auth.py is @router.post("/login"). 
    # But in __init__.py it is included with prefix="/auth".
    # So it is /api/v1/auth/login.
    # IN MY TEST I used /auth/token. Fix it.
    
    resp = client.post(f"{settings.api_prefix}/auth/login", data=login_data)
    if resp.status_code != 200:
        print(f"Login failed: {resp.status_code} - {resp.text}")
        raise ValueError(f"Auth failed: {resp.text}")
    return resp.json()["access_token"]

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}

def test_auth_flow(client):
    """Verify that we can't access data without a token."""
    resp = client.get(f"{settings.api_prefix}/content/")
    assert resp.status_code == 401

import tempfile

def test_media_upload(client, auth_headers):
    """Verify media upload functionality."""
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp.write(b"fake image data")
        tmp_path = tmp.name
        
    try:
        with open(tmp_path, "rb") as f:
            resp = client.post(
                f"{settings.api_prefix}/media/upload",
                headers=auth_headers,
                files={"file": ("test.png", f, "image/png")}
            )
        
        assert resp.status_code == 201
        data = resp.json()
        assert "id" in data
        assert data["filename"] == "test.png"
        return data["id"]
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

def test_content_creation_with_media(client, auth_headers):
    """Verify creating content with attached media."""
    # First upload media
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp.write(b"fake image data 2")
        tmp_path = tmp.name
        
    try:
        with open(tmp_path, "rb") as f:
            m_resp = client.post(
                f"{settings.api_prefix}/media/upload",
                headers=auth_headers,
                files={"file": ("test2.png", f, "image/png")}
            )
        assert m_resp.status_code == 201
        media_id = m_resp.json()["id"]
        
        # Create content
        content_payload = {
            "title": "Test Premium Post",
            "body": "This is a post with media attached via JWT.",
            "media_id": media_id
        }
        resp = client.post(f"{settings.api_prefix}/content/", headers=auth_headers, json=content_payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Test Premium Post"
        assert data["media_id"] == media_id
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

def test_insights_api_flow(client, auth_headers):
    """Verify that insights API exists and handles 'not posted' condition."""
    # Create some content
    content_payload = {
        "title": "Insights Test",
        "body": "Checking insights route"
    }
    c_resp = client.post(f"{settings.api_prefix}/content/", headers=auth_headers, json=content_payload)
    content_id = c_resp.json()["id"]
    
    # Try to get insights for a post that isn't on FB yet (requires meta_page_id param)
    i_resp = client.get(f"{settings.api_prefix}/content/{content_id}/insights?meta_page_id=1", headers=auth_headers)
    assert i_resp.status_code == 400
    assert "not been posted" in i_resp.json()["detail"]

def test_calendar_vce_integration(client, auth_headers):
    """Verify that VCE categories are available behind auth."""
    resp = client.get(f"{settings.api_prefix}/vce/categories", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

def test_token_guard_task_logic():
    """Verify the token guard task can be imported and logic initialized."""
    from app.scheduler import token_guard_task
    # We won't run it (since it needs Meta models/DB setup), but check it's defined
    assert token_guard_task is not None
