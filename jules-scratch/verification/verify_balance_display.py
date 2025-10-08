import re
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the login page with a longer timeout
        page.goto("http://127.0.0.1:8080/auth", timeout=60000)

        # Wait for the page to be fully loaded
        page.wait_for_load_state("load", timeout=30000)

        # Wait for the email input to be visible and fill in credentials
        email_input = page.get_by_placeholder('Email')
        expect(email_input).to_be_visible(timeout=45000)
        email_input.fill("test@example.com")

        password_input = page.get_by_placeholder('Password')
        expect(password_input).to_be_visible()
        password_input.fill("password")

        # Click the sign-in button
        sign_in_button = page.get_by_role("button", name="Sign In")
        expect(sign_in_button).to_be_enabled()
        sign_in_button.click()

        # Wait for navigation to the workspace and for the balance to be displayed
        page.wait_for_url("http://127.0.0.1:8080/workspace/generate", timeout=60000)

        workspace_header = page.locator('header')
        expect(workspace_header).to_be_visible(timeout=30000)

        # Explicitly wait for the balance element to contain the provider name
        balance_element = workspace_header.get_by_text(re.compile(r'Suno', re.IGNORECASE))
        expect(balance_element).to_be_visible(timeout=30000)

        # Take a screenshot of the header
        workspace_header.screenshot(path="jules-scratch/verification/verification.png")
        print("Screenshot captured successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)