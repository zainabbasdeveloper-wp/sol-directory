import mongoose, { Schema, type Document } from 'mongoose';

/**
 * A one-row-per-suburb geocoding cache: (state, suburbSlug) -> centroid
 * coordinates. Shared by every part of the app that needs to put a
 * register listing, a worker, or a provider's service area on a map but
 * only has a suburb name, not a street address — the register data and
 * a worker's own profile only ever have a suburb, never an address, so
 * a marker here always means "somewhere in this suburb", not a precise
 * building. Geocoding a suburb once and reusing it for every
 * listing/worker in that suburb is also the only sane way to plot
 * 26,000+ register listings without 26,000 Mapbox calls.
 */
export interface SuburbGeoDoc extends Document {
  state: string;
  suburbSlug: string;
  suburb: string;
  location: { type: 'Point'; coordinates: [number, number] }; // [lng, lat]
  geocodedAt: Date;
  /** Set (no location) when Mapbox had no result — kept so re-runs don't retry it every time. */
  failed?: boolean;
}

const suburbGeoSchema = new Schema<SuburbGeoDoc>({
  state: { type: String, required: true },
  suburbSlug: { type: String, required: true },
  suburb: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number] },
  },
  geocodedAt: { type: Date, default: Date.now },
  failed: { type: Boolean, default: false },
});

suburbGeoSchema.index({ state: 1, suburbSlug: 1 }, { unique: true });
suburbGeoSchema.index({ location: '2dsphere' });

export default mongoose.model<SuburbGeoDoc>('SuburbGeo', suburbGeoSchema);
