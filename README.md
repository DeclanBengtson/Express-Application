# Express Application
This Project was developed as part of an assessment for a university unit on web computing.<br/>
The task required the writing and deploying of a server-sided Express application that replicates and extends a previously provided API.<br/>
Technologies utilised in this project includes:<br/>
&ensp;&ensp;  •	Node<br/>
&ensp; &ensp; •	Express<br/>
&ensp; &ensp; •	MySQL <br/>
&ensp; &ensp; •	Swagger<br/>
&ensp; &ensp; •	Knex<br/>
&ensp; &ensp; •	JSON Web Tokens<br/>
The SQL database consists of the following tables:<br/>
&ensp; &ensp; •	basics – containing information about each film<br/>
&ensp; &ensp; •	crew – (not utilised in this project)<br/>
&ensp; &ensp; •	names – contains information about people, used for the /people/{id} endpoint<br/>
&ensp; &ensp; •	principals – containing information about 10 of the main people that worked on the film<br/>
&ensp; &ensp; •	ratings – containing ratings from IMDB, Rotten Tomatoes and Metacritic<br/>
&ensp; &ensp; •	ratingsold – (not utilised in this project)<br/>
&ensp; &ensp; •	users - containg information about the users  <br/>
# Setup
In order to run the application locally first clone the repository and open it in an IDE locally.<br/>
Start by installing the node modules:<br/>
### `npm install`
In the project directory you can then run: 
### `npm start`
Open https://localhost:3000/ to view it locally.

# Demo
![Page.png](/docs/Page.png)

