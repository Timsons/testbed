# Create suite with each remaining valid status enum value succeeds

## Preconditions

None

## Steps

1. Send a create-suite request with name "Suite In Progress", feature "login", and status "in-progress". Read the response.
2. Send a create-suite request with name "Suite Passed", feature "login", and status "passed". Read the response.
3. Send a create-suite request with name "Suite Failed", feature "login", and status "failed". Read the response.

## Expected Result

Each request returns success, and each created suite has the exact status value that was submitted ("in-progress", "passed", "failed" respectively).

## Severity

Major

## Status

Draft
