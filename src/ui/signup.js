
import { base } from "./shell.js";
export function signupHTML(){
  return base({
    title:"Sign up",
    body:`<div class="card">
      <h3 style="margin-top:0">Tell us about you</h3>
      <form method="post" action="/signup">
        <div class="grid">
          <input name="first_name" placeholder="First name*" required>
          <input name="last_name" placeholder="Last name*" required>
          <input name="company" placeholder="Company">
          <input name="phone" placeholder="Phone*" required>
          <input name="email" type="email" placeholder="Email">
          <input name="street" placeholder="Street">
          <input name="city" placeholder="City">
          <input name="zip" placeholder="ZIP">
          <input name="comment" placeholder="Interested in...">
        </div>
        <div style="margin-top:12px" class="row">
          <input type="checkbox" id="terms" required><label for="terms">I agree with Terms &amp; Conditions</label>
        </div>
        <div class="row" style="margin-top:12px"><button class="btn">Submit</button></div>
      </form>
    </div>`
  });
}
