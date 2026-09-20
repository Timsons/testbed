# Add existing test case to suite appends it to the end of the order

## Preconditions

A suite exists with two linked test cases, at sort_order 0 and 1. A third, unlinked test case exists.

## Steps

1. Send an add-case request to the suite with the id of the third test case.
2. Read the response.
3. Fetch the suite's detail.

## Expected Result

The API returns success. The suite now has three linked test cases; the newly added one has sort_order 2, and the first two cases keep their original positions and order.

## Severity

Major

## Status

Draft
