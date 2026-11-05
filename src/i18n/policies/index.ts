import type { PolicyContent, PolicySlug } from "./types";
import { privacy } from "./privacy";
import { terms } from "./terms";
import { refund } from "./refund";
import { delivery } from "./delivery";
import { disclaimer } from "./disclaimer";
import { copyright } from "./copyright";
import { contact } from "./contact";

export { policySlugs, type PolicySlug } from "./types";

/** Every policy page, in every locale. */
export const policies: Record<PolicySlug, PolicyContent> = { privacy, terms, refund, delivery, disclaimer, copyright, contact };
