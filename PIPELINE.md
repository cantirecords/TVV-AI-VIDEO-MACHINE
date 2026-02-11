# TVV AI Video Machine: Automation Pipeline

This document explains how your videos go from a news article to a published Reel/Short automatically.

## 1. Trigger: GitHub Action
The entire process starts on **GitHub**.
- **Schedule**: A GitHub Action is configured to run **every 2 hours** (`0 */2 * * *`).
- **Execution**: The action runs `npm start`.
- **Output**: The machine scrapes the news, generates the script, and renders `out/video.mp4`.

## 2. Hand-off: The Webhook
Once the video is rendered, GitHub needs to tell **Make.com** that it's ready.
- **Workflow Step**: We add a step in the GitHub Action to `POST` the video file (or a link to it) to a **Make.com Webhook URL**.
- **Meta Data**: It also sends the article title and source.

## 3. Orchestration: Make.com
Make.com acts as the "Manager".
- **Input**: Receives the signal from GitHub.
- **Processing**: It can perform final checks, add the video to a database log, or even notify you on Telegram/Slack for approval.
- **Dispatch**: It sends the video to the social media modules.

## 4. Publication: Facebook & Instagram
The final step is the official **Social Media API**.
- **Facebook Groups/Pages**: Make uses the Facebook and Instagram for Business APIs.
- **Reel Upload**: The video is uploaded as a **Reel** with the title as the description.
- **Auto-Publish**: Once uploaded, it goes live immediately.

---

### How to set this up:
1. **GitHub Secrets**: Add `GROQ_API_KEY` and your `MAKE_WEBHOOK_URL` to your GitHub Repository Secrets.
2. **Make Scenario**: Create a new scenario in Make with a "Custom Webhook" as the first module.
3. **Facebook Connection**: Add the Facebook/Instagram module in Make and authenticate your account.

Now, every time your code runs on GitHub, a high-quality Reel is born! 🚀
