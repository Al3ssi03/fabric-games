//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { date, entity, int, role, text, uuid } from '@microsoft/rayfin-core';

/**
 * One finished run of a single-player game, shown on the arcade leaderboard.
 *
 * Every signed-in user can read every score (that is what a leaderboard is),
 * but a row can only be created or deleted by its owner: the policy compares
 * `owner_id` with the caller's `sub` claim server side, so nobody can post a
 * score under someone else's name. Scores are immutable — there is no update.
 *
 * Every `@text` carries an explicit `max` so MSSQL never gets `NVARCHAR(MAX)`.
 */
@entity()
@role('authenticated', 'read')
@role('authenticated', ['create', 'delete'], {
  policy: (claims, item) => claims.sub.eq(item.owner_id),
})
export class Score {
  @uuid() id!: string;
  @text({ min: 1, max: 32 }) game!: string;
  @int() points!: number;
  @text({ min: 1, max: 120 }) playerName!: string;
  @date() createdAt!: Date;
  @text({ max: 200 }) owner_id!: string;
}
