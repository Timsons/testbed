# Add case to suite with a non-existent test_case_id is rejected

## Preconditions

A suite exists. No test case exists with id 999999.

## Steps

1. Send an add-case request to the suite with test_case_id 999999.
2. Read the response.
3. Fetch the suite's detail.

## Expected Result

The API returns an error and the suite's linked cases are unchanged.

## Severity

Major

## Status

Draft
