# calendar

Calendar is an web service that lists your google calendar's upcoming events and lets you to send the event to someone. All you need is to authentiate yourself with your google account.

 Authentication

The Authentication used is Oauth2 as used by google. The authentication is achieved using the passport library of node.js .

 Api used
Google's api is used to achieve the access to google calendar as well as sending email.

 Accesing calendar
The calendar is accessed using the google api. Firstly the user's calendar is accessed and stored into the calendar variable using 
oauth as authentication.
Once the calendar is accessible the method to get upcoming events .i.e., calendar.events.list() is called which return the events
object.
The returned list of events is passed as a parameter to events.ejs that displays the events.

 Sending events
The user clicks on whichever event he wants to send to the attendee he wish. Once he fills all the details the attendee is sent an email 
containing the event invite.
This functionality is achieved using nodemailer library . The event that the user wants to send is converted into its .ics file and then 
added to the email.



