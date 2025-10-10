import re
import time
from playwright.sync_api import Page, expect, sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    # This script will run on every page load and force a desktop-like innerWidth
    context.add_init_script("Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });")
    page = context.new_page()

    try:
        # 1. Sign up a new user
        page.goto("http://127.0.0.1:8080/auth", timeout=60000)
        expect(page.get_by_role("tab", name="Sign Up")).to_be_visible(timeout=15000)
        page.get_by_role("tab", name="Sign Up").click()

        unique_email = f"test-user-{int(time.time())}@example.com"
        page.get_by_placeholder("Email").fill(unique_email)
        page.get_by_placeholder("Password").fill("Password123")
        page.get_by_role("button", name=re.compile("Sign Up", re.IGNORECASE)).click()

        print(f"Signed up with new user: {unique_email}")
        expect(page).to_have_url(re.compile(r".*/workspace/.*"), timeout=20000)
        print("Login successful.")

        # 2. Navigate to library and play a track
        page.locator('a[href*="/workspace/library"]').click()
        expect(page).to_have_url(re.compile(r".*/library"), timeout=10000)

        # It's a new user, so we need to generate a track first.
        page.locator('a[href*="/workspace/generate"]').click()
        expect(page).to_have_url(re.compile(r".*/generate"), timeout=10000)

        prompt_textarea = page.get_by_placeholder(re.compile("Энергичный электронный трек", re.IGNORECASE))
        expect(prompt_textarea).to_be_visible()
        prompt_textarea.fill("A beautiful synthwave track for driving at night.")

        generate_button = page.get_by_role("button", name="Сгенерировать музыку")
        expect(generate_button).to_be_enabled()
        page.screenshot(path="jules-scratch/verification/01_generate_form_ui.png")
        print("Screenshot of Generate form taken.")
        generate_button.click()

        # Wait for the track to be generated and appear in the list
        expect(page.locator('.track-card')).to_have_count(1, timeout=120000)
        print("Track generated and appeared in the list.")

        # 3. Play the track and verify player UI
        first_track_card = page.locator('.track-card').first
        first_track_card.click()
        print("Clicked on the generated track.")

        # Verify MiniPlayer UI
        mini_player = page.locator('.fixed.bottom-0')
        expect(mini_player).to_be_visible(timeout=10000)
        page.screenshot(path="jules-scratch/verification/02_mini_player_ui.png")
        print("Screenshot of MiniPlayer taken.")

        # Expand to FullScreenPlayer and verify controls
        mini_player.click()
        full_screen_player = page.locator('div[role="dialog"][aria-label="Full Screen Player"]')
        expect(full_screen_player).to_be_visible(timeout=10000)

        # Check for version dropdown
        version_button = full_screen_player.locator('button[title*="версий"]')
        expect(version_button).to_be_visible()
        print("Version dropdown is visible.")

        page.screenshot(path="jules-scratch/verification/03_full_screen_player_ui.png")
        print("Screenshot of FullScreenPlayer taken.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)