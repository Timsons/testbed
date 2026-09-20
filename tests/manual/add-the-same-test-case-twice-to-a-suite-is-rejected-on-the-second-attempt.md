# Add the same test case twice to a suite is rejected on the second attempt

## Preconditions

A suite exists. Test case A is already linked to the suite.

## Steps

1. Send an add-case request to the suite with test_case_id A again.
2. Read the response.
3. Fetch the suite's detail.

## Expected Result

The API returns an error on the second add attempt. Test case A remains linked exactly once; no duplicate link is created.

## Severity

Major

## Status

Draft
