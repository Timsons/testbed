# Remove a test case that is not linked to the suite returns an error

## Preconditions

A suite exists with no link to test case B. Test case B exists (linked to a different suite, or unlinked entirely).

## Steps

1. Send a remove-case request to the suite with test_case_id B.
2. Read the response.

## Expected Result

The API returns an error, since test case B is not linked to this suite. The suite's actual linked cases are unchanged.

## Severity

Major

## Status

Draft
