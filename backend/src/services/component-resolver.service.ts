import type {
  ComponentMetadata,
  ComponentRegistry,
  ComponentRegistryEntry,
} from '../types/component.types';
import {
  ComponentNotFoundError,
  ComponentNotEditableError,
  InvalidComponentIdError,
} from '../errors/component.errors';
import { componentRegistry } from '../config/component-registry';

/**
 * Service responsible for resolving client component IDs against the trusted
 * component registry.
 *
 * Enforces security boundaries:
 * - Never trusts client-supplied file paths.
 * - Rejects empty, malformed, unknown, or non-editable component IDs.
 * - Kept strictly decoupled from HTTP request/response objects.
 */
export class ComponentResolverService {
  private readonly registry: ComponentRegistry;

  constructor(registry: ComponentRegistry = componentRegistry) {
    this.registry = registry;
  }

  /**
   * Resolves a component ID to its trusted registry entry.
   * Only returns components that are explicitly registered and marked as editable.
   *
   * @param componentId Stable component identifier (e.g. data-patchwork-id)
   * @returns Authorized ComponentRegistryEntry
   */
  public resolveComponent(componentId: string): ComponentRegistryEntry {
    if (!componentId || typeof componentId !== 'string' || !componentId.trim()) {
      throw new InvalidComponentIdError('Component ID must be a non-empty string.');
    }

    const trimmedId = componentId.trim();

    // Check registry for entry
    const entry = this.registry[trimmedId];
    if (!entry) {
      throw new ComponentNotFoundError(trimmedId);
    }

    // Verify component is authorized for editing
    if (!entry.editable) {
      throw new ComponentNotEditableError(trimmedId);
    }

    return entry;
  }

  /**
   * Returns safe metadata for a component (suitable for client exposure).
   * Strips filesystem paths and internal repository structures.
   */
  public getComponentMetadata(componentId: string): ComponentMetadata {
    const entry = this.resolveComponent(componentId);
    return {
      id: entry.id,
      componentName: entry.componentName,
      editable: entry.editable,
      editableScope: entry.editableScope,
      allowedOperations: entry.allowedOperations,
      description: entry.description,
      framework: entry.framework,
    };
  }

  /**
   * Lists safe metadata for all registered editable components.
   */
  public listComponents(): ComponentMetadata[] {
    return Object.values(this.registry)
      .filter((entry) => entry.editable)
      .map((entry) => ({
        id: entry.id,
        componentName: entry.componentName,
        editable: entry.editable,
        editableScope: entry.editableScope,
        allowedOperations: entry.allowedOperations,
        description: entry.description,
        framework: entry.framework,
      }));
  }
}

/**
 * Singleton instance using the default configured registry.
 */
export const componentResolverService = new ComponentResolverService();

/**
 * Functional convenience helper for component resolution.
 */
export function resolveComponent(
  componentId: string,
  registry?: ComponentRegistry
): ComponentRegistryEntry {
  const service = registry ? new ComponentResolverService(registry) : componentResolverService;
  return service.resolveComponent(componentId);
}
