#!/bin/bash
# .clifford/clifford-sprint.sh - Wrapper for the Clifford Sprint Loop

set -e

# Run the Clifford sprint loop using the CLI
# Passing "." tells Clifford to find the active sprint automatically.
clifford sprint .
