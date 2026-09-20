# Add case to suite without providing a test_case_id is rejected

## Preconditions

A suite exists.

## Steps

1. Send an add-case request to the suite, omitting the test_case_id field entirely.
2. Read the response.
3. Fetch the suite's detail.

## Expected Result

The API returns an error. The suite's linked cases are unchanged.

## Severity

Major

## Status

Draft
