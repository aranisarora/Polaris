/**
 * Polaris design system — every shared component, one import path.
 * Usage and props for each export are documented in docs/COMPONENTS.md.
 */

// identity glyphs
export {
  StarGlyph,
  WaypointGlyph,
  NorthStarGlyph,
  PositionCross,
  CompassRose,
} from "./glyphs";
export type {
  StarGlyphProps,
  WaypointGlyphProps,
  WaypointState,
  NorthStarGlyphProps,
  PositionCrossProps,
  CompassRoseProps,
} from "./glyphs";

// actions
export { Button, LinkButton, buttonClasses } from "./Button";
export type { ButtonProps, LinkButtonProps, ButtonVariant, ButtonSize } from "./Button";
export { IconButton } from "./IconButton";
export type { IconButtonProps } from "./IconButton";

// forms
export { Field } from "./Field";
export type { FieldProps } from "./Field";
export { Input, CONTROL_CLASSES } from "./Input";
export type { InputProps } from "./Input";
export { Textarea } from "./Textarea";
export type { TextareaProps } from "./Textarea";
export { Select } from "./Select";
export type { SelectProps } from "./Select";
export { ChoiceCard, ChoiceCardGroup } from "./ChoiceCard";
export type { ChoiceCardProps, ChoiceCardGroupProps } from "./ChoiceCard";
export { ViewSwitch } from "./ViewSwitch";
export type { ViewSwitchProps, ViewSwitchOption } from "./ViewSwitch";

// surfaces
export { Panel } from "./Panel";
export type { PanelProps } from "./Panel";
export { ChartFrame } from "./ChartFrame";
export type { ChartFrameProps } from "./ChartFrame";
export { Dialog } from "./Dialog";
export type { DialogProps } from "./Dialog";

// states
export { Skeleton } from "./Skeleton";
export type { SkeletonProps } from "./Skeleton";
export { EmptyState } from "./EmptyState";
export type { EmptyStateProps } from "./EmptyState";
export { ErrorState } from "./ErrorState";
export type { ErrorStateProps } from "./ErrorState";
export { ToastProvider, useToast } from "./Toast";
export type { ToastOptions, ToastTone } from "./Toast";

// instruments
export { TierStar, TIER_COLOR } from "./TierStar";
export type { TierStarProps } from "./TierStar";
export { ProgressRoute } from "./ProgressRoute";
export type { ProgressRouteProps } from "./ProgressRoute";
export { StageReadout } from "./StageReadout";
export type { StageReadoutProps } from "./StageReadout";
export { CompassSpinner } from "./CompassSpinner";
export type { CompassSpinnerProps } from "./CompassSpinner";

// world
export { StarField } from "./StarField";
export type { StarFieldProps } from "./StarField";
export { Graticule } from "./Graticule";
export type { GraticuleProps } from "./Graticule";
export { Wordmark } from "./Wordmark";
export type { WordmarkProps } from "./Wordmark";

// hooks
export { useReducedMotion } from "./use-reduced-motion";
