import mongoose, { Schema, type Document } from 'mongoose';

// The canonical condition/disability catalogue — admin-managed, same
// pattern as Service. Providers, workers, and participants all
// reference condition NAMES from this catalogue (validated against
// it, not free text), which is what makes matching on conditions
// possible without fuzzy string comparison.
export interface ConditionDoc extends Document {
  name: string;
  category: string;
  active: boolean;
}

const conditionSchema = new Schema<ConditionDoc>(
  {
    name: { type: String, required: true, unique: true },
    category: { type: String, required: true, index: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<ConditionDoc>('Condition', conditionSchema);
