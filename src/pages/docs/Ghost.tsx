// src/pages/docs/Ghost.tsx

import { DocsLayout } from "@/components/DocsLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useTrackingScriptToken } from "@/hooks/useTrackingScriptToken";

const Ghost = () => {
  const { trackingToken } = useTrackingScriptToken();
  const tokenPlaceholder = trackingToken || "YOUR_TRACKING_TOKEN";

  const copyToClipboard = () => {
    const code = `<script>
  !function(){
    var s=document.createElement("script");
    s.src="https://cdn.modovisa.com/modovisa.min.js";
    s.async=1;
    s.dataset.token="${tokenPlaceholder}";
    document.head.appendChild(s);
  }();
</script>`;
    navigator.clipboard.writeText(code);
  };

  return (
    <DocsLayout>
      <div className="container max-w-8xl mx-auto py-12 px-6">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Install on Ghost
          </h1>
          <Badge className="bg-primary text-primary-foreground px-4 py-1 text-sm font-semibold">
            Use Ghost’s Code Injection (Header) to add the Modovisa tracking script site-wide.
          </Badge>
        </div>

        {/* Main Content Card */}
        <Card className="p-8 mb-8">
          {/* Introduction */}
          <div className="mb-8">
            <p className="text-lg text-muted-foreground mb-4">
              The recommended method on Ghost is{" "}
              <span className="font-semibold text-foreground">
                Settings → Advanced → Code injection
              </span>
              . Paste your{" "}
              <span className="font-semibold text-foreground">
                Tracking Token
              </span>{" "}
              into the{" "}
              <span className="font-semibold text-foreground">Header</span>{" "}
              field, save, and you&apos;re done.
            </p>

            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-900 dark:text-blue-100">
                Code Injection applies site-wide. If you only want specific
                templates, you can place the snippet in theme files, but Code
                Injection is safer and faster.
              </p>
            </div>
          </div>

          <hr className="my-8 border-border" />

          {/* Installation Steps (site-wide) */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Step-by-step</h2>

            <ol className="space-y-3 list-decimal list-inside text-muted-foreground mb-4">
              <li>Log in to your <span className="font-semibold text-foreground">Ghost</span> workspace.</li>
              <li>Click the <span className="font-semibold text-foreground">⚙️ Settings</span> icon (bottom-left).</li>
            </ol>

            <div className="border border-border rounded-lg overflow-hidden mb-4">
              <img
                src="/assets/img/docs/1-ghost-workspace.webp"
                alt="Ghost workspace settings icon"
                className="w-full"
                loading="lazy"
              />
            </div>

            <ol
              className="space-y-3 list-decimal list-inside text-muted-foreground mb-4"
              start={3}
            >
              <li>
                In the left menu, under{" "}
                <span className="font-semibold text-foreground">Advanced</span>,
                click{" "}
                <span className="font-semibold text-foreground">
                  {"<"}{"<>"} Code injection
                </span>
                , then click{" "}
                <span className="font-semibold text-foreground">Open</span> on
                the right panel.
              </li>
            </ol>

            <div className="border border-border rounded-lg overflow-hidden mb-4">
              <img
                src="/assets/img/docs/2-code-injection-menu.webp"
                alt="Ghost Code Injection menu location"
                className="w-full"
                loading="lazy"
              />
            </div>

            <ol
              className="space-y-3 list-decimal list-inside text-muted-foreground mb-4"
              start={4}
            >
              <li>
                In the <span className="font-semibold text-foreground">Header</span>{" "}
                section, paste the Modovisa tracking script (below).
              </li>
              <li>
                Click <span className="font-semibold text-foreground">Save</span>.
              </li>
            </ol>

            <div className="border border-border rounded-lg overflow-hidden mb-6">
              <img
                src="/assets/img/docs/3-code-injection.webp"
                alt="Ghost Code Injection panel"
                className="w-full"
                loading="lazy"
              />
            </div>

            {/* Code Snippet */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-4">Tracking Script</h3>
              <div className="bg-slate-900 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                    className="text-xs border border-black bg-black text-white hover:bg-white hover:text-black"
                  >
                    Copy Code
                  </Button>
                </div>
                <pre className="p-4 overflow-x-auto">
                  <code className="text-sm text-slate-100">
                    {`<script>
  !function(){
    var s=document.createElement("script");
    s.src="https://cdn.modovisa.com/modovisa.min.js";
    s.async=1;
    s.dataset.token="`}
                    <span className="text-green-400">{tokenPlaceholder}</span>
                    {`";
    document.head.appendChild(s);
  }();
</script>`}
                  </code>
                </pre>
              </div>
            </div>

            {/* Video Tutorial */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Video Tutorial</h3>
              <div className="border border-border rounded-lg overflow-hidden shadow-lg">
                <div className="relative" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    src="https://www.youtube.com/embed/XmbAVMJ6zQE?si=6W2c4YqNqpfRqFhg"
                    title="Install Modovisa on Ghost"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    className="absolute top-0 left-0 w-full h-full"
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="my-8 border-border" />

          {/* Per-Post Tracking */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">
              Alternative — Track specific posts only
            </h2>
            <p className="text-muted-foreground mb-4">
              If you only want to track certain posts or pages:
            </p>

            <ol className="space-y-3 list-decimal list-inside text-muted-foreground">
              <li>Open the post or page editor.</li>
              <li>
                Click the{" "}
                <span className="font-semibold text-foreground">Settings</span>{" "}
                gear icon.
              </li>
              <li>
                Scroll to{" "}
                <span className="font-semibold text-foreground">
                  Code Injection
                </span>
                .
              </li>
              <li>
                Paste the Modovisa tracking script in the{" "}
                <span className="font-semibold text-foreground">
                  Post Header
                </span>{" "}
                field.
              </li>
              <li>
                Click{" "}
                <span className="font-semibold text-foreground">Update</span>.
              </li>
            </ol>
          </div>

          <hr className="my-8 border-border" />

          {/* Verification */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Verify the installation</h2>
            <ul className="space-y-2 list-disc list-inside text-muted-foreground mb-6">
              <li>Open your site in a new tab.</li>
              <li>
                Open{" "}
                <span className="font-mono text-foreground">
                  DevTools → Network
                </span>{" "}
                and reload. Search for{" "}
                <code className="px-2 py-1 bg-muted rounded text-foreground">
                  modovisa.min.js
                </code>
                .
              </li>
              <li>
                Enable &quot;Preserve log&quot; and refresh—confirm the script
                loads on public pages.
              </li>
              <li>
                In your Modovisa dashboard, go to{" "}
                <span className="font-semibold text-foreground">Live</span> to
                see your visit in real time.
              </li>
            </ul>

            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Ghost caches aggressively. If the script doesn&apos;t appear
                immediately, wait a few minutes and try again in an incognito
                window.
              </p>
            </div>
          </div>
        </Card>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            asChild
            className="border border-black bg-black text-white hover:bg-white hover:text-black"
          >
            <a href="/docs">← Back to Docs</a>
          </Button>
          <Button variant="link" asChild>
            <a
              href="https://support.modovisa.com"
              target="_blank"
              rel="noopener"
            >
              Need help? Contact Support
            </a>
          </Button>
        </div>
      </div>
    </DocsLayout>
  );
};

export default Ghost;
