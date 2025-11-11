
from playwright.sync_api import sync_playwright, expect

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # Login
            page.goto("http://127.0.0.1:8080/auth", wait_until="domcontentloaded")

            # Wait for the login form to be visible before interacting
            login_form_selector = "form"
            page.wait_for_selector(login_form_selector)

            page.get_by_label("Email").fill("test@example.com")
            page.get_by_label("Password").fill("TestPassword123!")
            page.get_by_role("button", name="Sign In").click()

            # Wait for navigation to complete
            page.wait_for_url("http://127.0.0.1:8080/workspace/generate")
            expect(page).to_have_url("http://127.0.0.1:8080/workspace/generate")

            # Go to Library
            page.get_by_role("link", name="Library").click()
            page.wait_for_url("http://127.0.0.1:8080/workspace/library")
            expect(page).to_have_url("http://127.0.0.1:8080/workspace/library")

            # Click on the first track to start playing
            first_track_selector = "div[data-track-id]:first-child"
            page.wait_for_selector(first_track_selector, timeout=15000) # Increased timeout for tracks to load
            page.click(first_track_selector)

            # Open the full screen player
            mini_player_selector = "div[data-testid='mini-player']"
            page.wait_for_selector(mini_player_selector)
            page.click(mini_player_selector)

            # Wait for the full screen player to be visible
            fullscreen_player_selector = "div[aria-label='Full Screen Player']"
            page.wait_for_selector(fullscreen_player_selector)

            # Wait for the skeleton to appear
            skeleton_selector = ".animate-pulse"
            page.wait_for_selector(skeleton_selector)

            # Take screenshot
            page.screenshot(path="verification/lyrics_skeleton.png")

        finally:
            browser.close()

if __name__ == "__main__":
    main()
