# V-Cell V2 — TODO

- Blocked aria-hidden on an element because its descendant retained focus. The focus must not be hidden from assistive technology users. Avoid using aria-hidden on a focused element or its ancestor. Consider using the inert attribute instead, which will also prevent focus. For more details, see the aria-hidden section of the WAI-ARIA specification at https://w3c.github.io/aria/#aria-hidden.
Element with focus: <button.btn btn--primary>
Ancestor with aria-hidden: <div.autocomplete-drawer>
- the pause button is displaying as an emoji on mobile
- stats tables are not mobile responsive
- display name
- auth email/pw
- daily seed
- Skeletons for everything
- Design system (Maddie?)
- offline play
- confirm reset deal and destructive actions with a modal?
- on mobile, if the modal is open and you open the nav bar the nav bar goes behind
- If I start a new deal during autocomplete then one card stays invisible
- Vertical space btw tables is too big on mobile 
- When I touch in a random spot on mobile I still see a card getting focus
- after kb drop, focus goes back to original source. I thought we arleady fixed this. focus should stay target position.