import express from "express";
import axios from "axios";
import jwt from "jsonwebtoken";

const router=express.Router();

router.post("/google",async(req,res)=>{

    // now the code and the redirecurl will come in the body of the request and we will use it to get the user data from google and then we will create a jwt token and send it back to the client
    const {code,redirectUrl}=req.body;

    //  the prcess is that we will give the clientid and clientsecret to google oauth api and then we will get the access token and then we will use that access token to get the user data from google and then we will create a jwt token and send it back to the client

    try{
        const response=await axios.post('https://oauth2.googleapis.com/token',{
            code:code,
            client_id:process.env.GOOGLE_CLIENT_ID,
            client_secret:process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri:redirectUrl,
            grant_type:'authorization_code'
        });

        const accessToken=response.data.access_token;//generated a accestoken tyo google with giving clientid and client secret

        const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    //got info aboput the user from google with the help of access token
    const userData = userResponse.data;
    console.log(userData);


    //creating a jwt tojken fot the given user by provioding a jwt secret

    const jwttoken=jwt.sign(
        {
        id:userData.id,
        email:userData.email,
        name:userData.name,
        picture:userData.picture
    },
    process.env.JWT_SECRET,
    {expiresIn:'7d' }
     )
    res.json({ success: true, token: jwttoken, user: userData });

    }
    catch (error) {
    console.error('Google Auth Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to authenticate with Google' });
  }
})

// done with google oauth authentication
// workflow===> got a clientid and clientsecret fron google ==> passed that to the google oauth==> creted a aceestoken for the user with that ==>got user data by giving the acess token to google oauth ==> generated a uniqque jwttoken for the backend route ton sign in 


router.post("/github",async(req,res)=>{

})