import express from "express";
import axios from "axios";
import jwt from "jsonwebtoken";

const router = express.Router();

router.post("/google", async (req, res) => {
  const { code } = req.body;
  const redirect_uri = req.body.redirectUri || req.body.redirectUrl;

  try {
    const response = await axios.post("https://oauth2.googleapis.com/token", {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri,
      grant_type: "authorization_code",
    });

    const accessToken = response.data.access_token;//generated a accestoken tyo google with giving clientid
    const userResponse = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const userData = {
      id: userResponse.data.id,
      name: userResponse.data.name,
      email: userResponse.data.email,
      avatar: userResponse.data.picture,
    };

    const jwtToken = jwt.sign(userData, process.env.JWT_SECRET || "default_dev_secret", {
      expiresIn: "7d",
    });

    res.json({ success: true, token: jwtToken, user: userData });
  } catch (error) {
    console.error("Google Auth Error:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.error_description || "Failed to authenticate with Google" });
  }
});

// done with google oauth authentication
// workflow===> got a clientid and clientsecret fron google ==> passed that to the google oauth==> creted a aceestoken for the user with that ==>got user data by giving the acess token to google oauth ==> generated a uniqque jwttoken for the backend route ton sign in 

router.post("/github", async (req, res) => {
  const { code } = req.body;
  const redirect_uri = req.body.redirectUri || req.body.redirectUrl;

  try {
    const response = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        code,
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        redirect_uri,
      },
      {
        headers: { Accept: "application/json" },
      }
    );

    const accessToken = response.data.access_token;
    if (!accessToken) {
      throw new Error(response.data.error_description || "No access token received from GitHub");
    }

    const userResponse = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const userData = {
      id: String(userResponse.data.id),
      name: userResponse.data.name || userResponse.data.login,
      email: userResponse.data.email || `${userResponse.data.login}@users.noreply.github.com`,
      avatar: userResponse.data.avatar_url,
    };

    const jwtToken = jwt.sign(userData, process.env.JWT_SECRET || "default_dev_secret", {
      expiresIn: "7d",
    });

    res.json({ success: true, token: jwtToken, user: userData });
  } catch (error) {
    console.error("GitHub Auth Error:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.error_description || error.message || "Failed to authenticate with GitHub" });
  }
});

export default router;