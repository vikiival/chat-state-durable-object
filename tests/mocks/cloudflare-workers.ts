export class DurableObject<TEnv = unknown> {
  constructor(
    public readonly ctx: DurableObjectState,
    public readonly env: TEnv,
  ) {}
}
