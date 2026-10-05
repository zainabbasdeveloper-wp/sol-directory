import type { PipelineStage } from 'mongoose';
import Provider from '../models/Provider.js';

const paidPlanExpression = {
  $and: [
    { $in: ['$plan', ['growth', 'pro']] },
    { $eq: ['$planStatus', 'active'] },
    {
      $or: [
        { $in: [{ $type: '$planExpiresAt' }, ['missing', 'null']] },
        { $gt: ['$planExpiresAt', '$$NOW'] },
      ],
    },
  ],
};

function project(fields: string): Record<string, 1> {
  return Object.fromEntries(fields.split(/\s+/).filter(Boolean).map((field) => [field, 1]));
}

export async function findProvidersPaidFirst<T>(
  filter: Record<string, unknown>,
  fields: string,
  options: { skip?: number; limit: number },
): Promise<T[]> {
  const pipeline: PipelineStage[] = [
    { $match: filter },
    {
      $set: {
        _paidPriority: { $cond: [paidPlanExpression, 1, 0] },
        _planPriority: {
          $switch: {
            branches: [
              { case: { $and: [paidPlanExpression, { $eq: ['$plan', 'pro'] }] }, then: 2 },
              { case: { $and: [paidPlanExpression, { $eq: ['$plan', 'growth'] }] }, then: 1 },
            ],
            default: 0,
          },
        },
      },
    },
    { $sort: { _paidPriority: -1, _planPriority: -1, tradingName: 1, legalEntityName: 1, _id: 1 } },
    ...(options.skip ? [{ $skip: options.skip } as PipelineStage] : []),
    { $limit: options.limit },
    { $project: project(fields) },
  ];

  return Provider.aggregate<T>(pipeline);
}