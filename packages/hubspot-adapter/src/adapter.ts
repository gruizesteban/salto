import {
  Change, ElemID, ObjectType,
  Element, InstanceElement, isInstanceElement,
} from 'adapter-api'
import {
  Form,
} from './client/types'
import HubspotClient from './client/client'

const validateFormGuid = (
  before: InstanceElement,
  after: InstanceElement
): void => {
  if (before.value.guid !== after.value.guid) {
    throw Error(
      `Failed to update element as guid's prev=${
        before.value.guid
      } and new=${after.value.guid} are different`
    )
  }
}

export interface HubspotAdapterParams {
  // client to use
  client: HubspotClient

}

export default class HubspotAdapter {
  private client: HubspotClient

  public constructor({
    client,
  }: HubspotAdapterParams) {
    this.client = client
  }

  /**
   * Fetch configuration elements: objects, types and instances for the given HubSpot account.
   * Account credentials were given in the constructor.
   */
  public async fetch(): Promise<Element[]> {
    const resp = await this.client.getAllForms()
    return resp.map(e => new InstanceElement(
      e.name,
      new ObjectType({ elemID: new ElemID('hubspot') }),
      {}
    ))
  }

  /**
   * Add new element
   * @param element the object/instance to add
   * @returns the updated element
   * @throws error in case of failure
   */
  public async add(element: Element): Promise<Element> {
    if (isInstanceElement(element)) {
      const resp = await this.client.createForm(
        {
          name: element.value.name,
        } as Form
      )
      element.value.guid = resp.guid
    }

    return element
  }

  /**
   * Remove an instance
   * @param instance to remove
   * @throws error in case of failure
   */
  public async remove(instance: InstanceElement): Promise<void> {
    await this.client.deleteForm(
      {
        guid: instance.value.guid,
      } as Form
    )
  }

  /**
   * Updates an Element
   * @param before The metadata of the old element
   * @param after The new metadata of the element to replace
   * @param changes to apply
   * @returns the updated element
   */
  public async update(
    before: Element,
    after: Element,
    _changes: ReadonlyArray<Change>
  ): Promise<Element> {
    if (isInstanceElement(before) && isInstanceElement(after)) {
      validateFormGuid(before, after)
      await this.client.updateForm(
        {
          guid: after.value.guid,
        } as Form
      )
    }

    return after
  }
}