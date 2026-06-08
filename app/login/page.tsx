import { redirect } from "next/navigation";
import { auth, isGoogleConfigured } from "@/lib/auth/auth";
import { LoginForm } from "./login-form";
import { Sparkles } from "lucide-react";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold">AI Executive Assistant</h1>
          <p className="text-sm text-muted-foreground">Sign in to your command center.</p>
        </div>

        <LoginForm googleConfigured={isGoogleConfigured} />

        <p className="text-center text-xs text-muted-foreground">
          New here? Use any email/password on the form to create an account automatically in this demo.
        </p>
      </div>
    </div>
  );
}
