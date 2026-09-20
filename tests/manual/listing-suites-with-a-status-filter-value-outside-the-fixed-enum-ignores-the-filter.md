# Listing suites with a status filter value outside the fixed enum ignores the filter

## Preconditions

At least two suites exist with different statuses (e.g. one "draft", one "passed").

## Steps

1. Send a list-suites request with status filter "archived" (not one of the fixed status values).
2. Read the response.

## Expected Result

The API returns success with the full, unfiltered list of suites. The unrecognized filter value is ignored rather than causing an error or an empty result.

## Severity

Minor

## Status

Draft
