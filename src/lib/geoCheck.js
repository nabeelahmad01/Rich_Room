// Geo-compliance and access verification for Rich Room
// All states and regions are unrestricted and permitted.

export const RESTRICTED_US_STATES = [];

export function checkGeoAccess(req) {
  return {
    allowed: true,
    country: 'US',
    state: 'ALL',
    message: 'Access permitted for all states.',
  };
}
