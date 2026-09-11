export interface InvitationRequest {
  name: string;
  email: string;
  phone: string;
  accessCode?: string;
  privacyConsent: true;
}

export interface CheckoutRequest {
  items: readonly { productId: string; variantId: string; quantity: number }[];
  customer: { name: string; email: string; phone: string; address: string };
  accessCode: string;
  consents: { privacy: true; terms: true; purchase: true };
}

export type AccessResult =
  | { status: "accepted"; mode: "preview" | "live" }
  | { status: "rejected"; message: string };
export type InvitationResult =
  { mode: "preview" } | { mode: "live"; requestId: string };

export interface StorefrontGateway {
  readonly mode: "preview" | "live";
  checkAccess(code: string, signal: AbortSignal): Promise<AccessResult>;
  requestInvitation(
    request: InvitationRequest,
    signal: AbortSignal,
  ): Promise<InvitationResult>;
  createCheckout(
    request: CheckoutRequest,
    signal: AbortSignal,
  ): Promise<{ redirectUrl: string }>;
}
