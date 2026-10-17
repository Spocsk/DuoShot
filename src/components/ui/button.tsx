import Link from "next/link";
import type { ComponentPropsWithRef } from "react";

const variants = {
  primary: "ds-cta",
  secondary: "ds-cta-ghost",
  text: "ds-text-btn",
  danger: "ds-danger",
  pill: "ds-pill ds-pill-ink",
  empty: "tool-empty-action",
} as const;

export type ButtonVariant = keyof typeof variants;
type StyleProps = {
  variant: ButtonVariant;
  /** New-set sizing remains owned by the command-bar's contextual CSS. */
  size?: "default" | "set";
  className?: string;
};
export type ButtonProps = StyleProps & (
  | ({ as: "button" } & ComponentPropsWithRef<"button">)
  | ({ as: "a" } & ComponentPropsWithRef<"a">)
  | ({ as: "link"; linkAs?: ComponentPropsWithRef<typeof Link>["as"] } & Omit<ComponentPropsWithRef<typeof Link>, "as">)
);

/** Shares class ownership while retaining the native element, children and React 19 ref. */
export function Button({ variant, size = "default", className, ...props }: ButtonProps) {
  // The existing context supplies this size; it deliberately adds no DOM or base styling.
  void size;
  const classes = [variants[variant], className].filter(Boolean).join(" ");
  if (props.as === "link") {
    const { as, linkAs, ...linkProps } = props;
    void as;
    return <Link {...linkProps} as={linkAs} className={classes} />;
  }
  if (props.as === "a") {
    const { as, ...anchorProps } = props;
    void as;
    return <a {...anchorProps} className={classes} />;
  }
  const { as, type = "button", ...buttonProps } = props;
  void as;
  return <button {...buttonProps} type={type} className={classes} />;
}
