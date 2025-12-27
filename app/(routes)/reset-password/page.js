export const dynamic = "force-dynamic";
import ResetPasswordClient from "./ResetPasswordClient";

export default function ResetPasswordPage() {
  // Server component: render client component for the interactive form
  return <ResetPasswordClient />;
}