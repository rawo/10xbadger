/**
 * Client-side API functions for badge applications
 *
 * These functions are used by React components to interact with the badge application API.
 * They handle HTTP requests, error parsing, and return typed responses.
 */

import type {
  BadgeApplicationDetailDto,
  CreateBadgeApplicationCommand,
  UpdateBadgeApplicationCommand,
  ApiError,
} from "@/types";

/**
 * Creates a new badge application in draft status
 *
 * @param data - Badge application data
 * @returns Created badge application with full details
 * @throws ApiError on validation or server errors
 */
export async function createBadgeApplication(data: CreateBadgeApplicationCommand): Promise<BadgeApplicationDetailDto> {
  const response = await fetch("/api/badge-applications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || "Failed to create badge application");
  }

  return response.json();
}

/**
 * Updates an existing badge application
 *
 * @param id - Badge application ID
 * @param data - Updated badge application data
 * @returns Updated badge application with full details
 * @throws ApiError on validation, authorization, or server errors
 */
export async function updateBadgeApplication(
  id: string,
  data: UpdateBadgeApplicationCommand
): Promise<BadgeApplicationDetailDto> {
  const response = await fetch(`/api/badge-applications/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || "Failed to update badge application");
  }

  return response.json();
}

/**
 * Submits a draft badge application for review
 *
 * @param id - Badge application ID
 * @returns Updated badge application with status='submitted'
 * @throws ApiError on validation, authorization, or server errors
 */
export async function submitBadgeApplication(id: string): Promise<BadgeApplicationDetailDto> {
  const response = await fetch(`/api/badge-applications/${id}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || "Failed to submit badge application");
  }

  return response.json();
}

/**
 * Fetches a single badge application by ID
 *
 * @param id - Badge application ID
 * @returns Badge application with full details
 * @throws ApiError if not found or unauthorized
 */
export async function getBadgeApplicationById(id: string): Promise<BadgeApplicationDetailDto> {
  const response = await fetch(`/api/badge-applications/${id}`);

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || "Failed to fetch badge application");
  }

  return response.json();
}
