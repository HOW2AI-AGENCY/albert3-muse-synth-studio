import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            # 1. Navigate to the login page
            await page.goto("http://127.0.0.1:8080/auth")

            # 2. Perform login
            await page.get_by_label("Электронная почта").fill("test@example.com")
            await page.get_by_label("Пароль").fill("password123")
            await page.get_by_role("button", name="Войти").click()

            # 3. Wait for navigation to the workspace
            await expect(page).to_have_url("http://127.0.0.1:8080/workspace/generate", timeout=10000)

            # Wait for tracks to load to avoid capturing a skeleton state
            await expect(page.get_by_text("Библиотека пуста")).to_be_visible(timeout=15000)

            # 4. Take a screenshot of the main workspace
            await page.screenshot(path="jules-scratch/verification/workspace_view.png", full_page=True)
            print("Screenshot 'workspace_view.png' captured successfully.")

        except Exception as e:
            print(f"An error occurred: {e}")
            # Take a screenshot on error for debugging
            await page.screenshot(path="jules-scratch/verification/error.png")

        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())