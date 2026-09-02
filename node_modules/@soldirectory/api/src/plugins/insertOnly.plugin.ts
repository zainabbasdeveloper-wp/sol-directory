import type { Schema, CallbackWithoutResultAndOptionalError } from 'mongoose';

/**
 * Attaches to any schema that must be append-only (the audit trail).
 * Blocks every mutation path Mongoose exposes — instance-level and
 * query-level, single and bulk — so "insert-only" is enforced by the
 * driver refusing the operation, not by developer discipline.
 */
export function insertOnlyPlugin(schema: Schema) {
  const guard = (next: CallbackWithoutResultAndOptionalError) => {
    next(new Error('This operation is not permitted — this collection is append-only.'));
  };

  schema.pre('updateOne', guard);
  schema.pre('updateMany', guard);
  schema.pre('deleteOne', guard);
  schema.pre('deleteMany', guard);
  schema.pre('findOneAndUpdate', guard);
  schema.pre('findOneAndDelete', guard);
  schema.pre('replaceOne', guard);

  schema.pre('save', function guardSave(next: CallbackWithoutResultAndOptionalError) {
    if (!this.isNew) {
      next(new Error('Documents in this collection cannot be modified after creation — it is append-only.'));
      return;
    }
    next();
  });
}
