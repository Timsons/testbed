# Create suite with valid name, feature, and status

## Preconditions

None

## Steps

1. Send a create-suite request with name "Login Regression", feature "login", and status "ready".
2. Read the response.

## Expected Result

The API returns success with the new suite's data, including name "Login Regression", feature "login", status "ready", and an empty list of linked test cases.

## Severity

Major

## Status

Draft
