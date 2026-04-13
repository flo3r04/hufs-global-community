import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { SignJWT } from "jose";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

const getJwtSecret = () =>
  new TextEncoder().encode(process.env.JWT_SECRET || "dev_secret_key_change_me_in_prod");

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");

    if (!code) {
      res.status(400).json({ error: "code is required" });
      return;
    }

    try {
      const kakaoClientId = process.env.VITE_KAKAO_CLIENT_ID;
      if (!kakaoClientId) {
        throw new Error("VITE_KAKAO_CLIENT_ID is missing");
      }
      const protocol = process.env.NODE_ENV === "production" ? "https" : req.protocol;
      const redirectUri = `${protocol}://${req.get("host")}/api/oauth/callback`;

      // 1. Get Token from Kakao
      const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: kakaoClientId,
          redirect_uri: redirectUri,
          code,
        }),
      });

      if (!tokenRes.ok) {
        const errJson = await tokenRes.text();
        console.error("Kakao Token Error:", errJson);
        throw new Error("Failed to get Kakao token");
      }
      
      const tokenData = await tokenRes.json();

      // 2. Get User Info
      const userRes = await fetch("https://kapi.kakao.com/v2/user/me", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userRes.ok) {
        throw new Error("Failed to get Kakao user info");
      }

      const userData = await userRes.json();
      const openId = String(userData.id);
      const nickname = userData.kakao_account?.profile?.nickname || "카카오 유저";
      const email = userData.kakao_account?.email || null;

      await db.upsertUser({
        openId,
        name: nickname,
        email,
        loginMethod: "kakao",
        lastSignedIn: new Date(),
      });

      const sessionToken = await new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(openId)
        .setIssuedAt()
        .setExpirationTime(Math.floor(Date.now() / 1000) + ONE_YEAR_MS / 1000)
        .sign(getJwtSecret());

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).send(`OAuth Error: ${error instanceof Error ? error.stack : String(error)}`);
    }
  });
}
