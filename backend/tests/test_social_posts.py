from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def auth_headers(email="social@example.com"):
    response = client.post(
        "/api/auth/register",
        json={
            "name": "Social User",
            "email": email,
            "password": "securepassword",
            "phone": "+123456789",
            "location": "Pune",
        },
    )
    assert response.status_code == 200, response.text
    token = response.json()["data"]["token"]
    return {"Authorization": f"Bearer {token}"}


def test_social_search_detects_job_posts():
    headers = auth_headers()
    response = client.post(
        "/api/social-posts/search",
        headers=headers,
        json={"query": "React fresher", "location": "Pune", "min_match_score": 0},
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    posts = payload["data"]["posts"]
    assert posts
    assert any(post["classification_type"] != "Non-Job Post" for post in posts)
    assert payload["data"]["unsupported_sources"]


def test_import_social_post_deduplicates_and_saves():
    headers = auth_headers("import@example.com")
    body = {
        "platform": "LinkedIn",
        "original_post_url": "https://www.linkedin.com/posts/demo-hiring-post",
        "author_name": "Recruiter",
        "post_text": "Looking for a junior Python developer. Skills: Python, FastAPI, SQL and Git. DM your resume.",
    }
    first = client.post("/api/social-posts/import-url", headers=headers, json=body)
    second = client.post("/api/social-posts/import-url", headers=headers, json=body)
    assert first.status_code == 200, first.text
    assert second.status_code == 200, second.text
    first_post = first.json()["data"]["post"]
    second_post = second.json()["data"]["post"]
    assert first_post["id"] == second_post["id"]
    assert first_post["job_id"]

    save_response = client.post(f"/api/social-posts/{first_post['id']}/save", headers=headers)
    assert save_response.status_code == 200, save_response.text
    assert save_response.json()["data"]["saved"] is True
