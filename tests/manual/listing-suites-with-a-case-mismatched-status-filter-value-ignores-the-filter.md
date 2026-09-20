# Listing suites with a case-mismatched status filter value ignores the filter

## Preconditions

At least two suites exist with different statuses (e.g. one "draft", one "passed").

## Steps

1. Send a list-suites request with status filter "Draft" (capital D, not an exact match to the stored value "draft").
2. Read the response.

## Expected Result

The API returns success with the full, unfiltered list of suites, since only an exact match against the fixed status list is honored as a filter.

## Severity

Minor

## Status

Draft
