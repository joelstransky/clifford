/* global require, process, console, setTimeout */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { chromium } = require("@playwright/test");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { spawn } = require("child_process");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const net = require("net");

async function findOpenPort(startPort) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on("error", () => {
      resolve(findOpenPort(startPort + 1));
    });
    server.listen(startPort, () => {
      server.close(() => {
        resolve(startPort);
      });
    });
  });
}

async function runCheck() {
  const PORT = await findOpenPort(8120);
  console.warn(`🚀 Starting Expo dev server on port ${PORT}...`);

  const expo = spawn(
    "npx",
    ["expo", "start", "--web", "--port", PORT.toString()],
    {
      shell: true,
      env: { ...process.env, CI: "1", EXPO_NO_TELEMETRY: "1" },
    },
  );

  let serverReady = false;
  const timeout = 120000; // 120 seconds
  const start = Date.now();

  return new Promise((resolve, reject) => {
    expo.stdout.on("data", (data) => {
      const output = data.toString();
      if (
        output.includes("web is available") ||
        output.includes(`localhost:${PORT}`)
      ) {
        serverReady = true;
      }
    });

    expo.stderr.on("data", () => {
      // Ignore stderr
    });

    const cleanup = () => {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", expo.pid, "/f", "/t"]);
      } else {
        expo.kill();
      }
    };

    const checkReady = async () => {
      if (serverReady) {
        console.warn("🌐 Server ready. Launching browser...");
        try {
          const browser = await chromium.launch({
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
          });
          const page = await browser.newPage();

          const errors = [];
          page.on("console", (msg) => {
            if (msg.type() === "error") {
              console.error(`PAGE ERROR: ${msg.text()}`);
              errors.push(msg.text());
            }
          });

          page.on("pageerror", (err) => {
            console.error(`PAGE UNCAUGHT ERROR: ${err.message}`);
            errors.push(err.message);
          });

          console.warn("⏳ Navigating to app...");
          let attempt = 0;
          let success = false;
          while (attempt < 3 && !success) {
            try {
              await page.goto(`http://localhost:${PORT}`, {
                waitUntil: "networkidle",
                timeout: 60000,
              });
              success = true;
            } catch {
              console.warn(
                `⚠️ Attempt ${attempt + 1} failed, retrying in 5s...`,
              );
              await new Promise((r) => setTimeout(r, 5000));
              attempt++;
            }
          }

          if (!success) {
            throw new Error("Failed to load app after 3 attempts");
          }

          console.warn("⏳ Waiting for app to settle...");
          await new Promise((r) => setTimeout(r, 10000));

          const criticalErrors = errors.filter(
            (e) =>
              !e.includes("Failed to load resource") ||
              e.includes("entry.bundle"),
          );

          if (criticalErrors.length > 0) {
            throw new Error(
              `Critical errors detected in browser console: ${criticalErrors[0]}`,
            );
          }

          console.warn("✅ App booted successfully in headless web mode.");
          await browser.close();
          cleanup();
          resolve();
        } catch (err) {
          cleanup();
          reject(err);
        }
      } else if (Date.now() - start > timeout) {
        cleanup();
        reject(new Error("Timed out waiting for Expo server"));
      } else {
        setTimeout(checkReady, 1000);
      }
    };

    setTimeout(checkReady, 1000);
  });
}

runCheck()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(`❌ Check failed: ${err.message}`);
    process.exit(1);
  });
