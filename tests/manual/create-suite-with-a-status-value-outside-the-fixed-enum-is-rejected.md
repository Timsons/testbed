# Create suite with a status value outside the fixed enum is rejected

## Preconditions

None

## Steps

1. Send a create-suite request with name "Test Suite", feature "login", and status "pending".
2. Read the response.

## Expected Result

The API returns an error and does not create a suite, because "pending" is not one of the allowed status values (draft, ready, in-progress, passed, failed).

Note: the feature description only specifies that an unrecognized status value is ignored when used as a list filter. This test assumes the same value is rejected outright when submitted on create, since status is a required field restricted to the fixed enum. Confirm this against the actual implementation.

## Severity

Major

## Status

Draft
