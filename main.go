package main

import (
	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/contrib/static"
	jwtmiddleware "github.com/auth0/go-jwt-middleware"
	jwt "github.com/dgrijalva/jwt-go"

	"net/http"
	"strconv"
	"os"
	"errors"
	"log"
	"github.com/gin-gonic/gin/json"
	"fmt"
)

type Response struct {
	Message string `json:"message"`
}

type Jwks struct {
	Keys []JSONWebKeys `json:"keys"`
}

type JSONWebKeys struct {
	Kty string   `json:"kty"`
	Kid string   `json:"kid"`
	Use string   `json:"use"`
	N   string   `json:"n"`
	E   string   `json:"e"`
	X5c []string `json:"x5c"`
}

type Quote struct {
	ID 		int		`json:"id" binding:"required"`
	Likes 	int		`json:"likes"`
	Quote 	string	`json:"quote" binding:"required"`
}

var quotes = []Quote{
	{1, 0, "The man in black fled across the desert, and the gunslinger followed."},
	{2, 0, "Go, then. There are other worlds than these."},
	{3, 0, "See the TURTLE of enormous girth, upon his shell he holds the Earth. His thought is slow, but always kind, he holds us all within his mind."},
	{4, 0, "It's turtles all the way down."},
	{5, 0, "Time is the thief of memory."},
	{6, 0, "Fools are the only folk on Earth who can absolutely count on getting what they deserve."},
	{7,0, "See the BEAR of fearsome size! All the WORLD'S within his eyes. TIME grows thing, the past is a riddle; the TOWER awaits you in the middle."},
}

var jwtMiddleware = jwtmiddleware.New(jwtmiddleware.Options{
	ValidationKeyGetter: func(token *jwt.Token) (interface{}, error) {
		aud := os.Getenv("AUTH0_API_AUDIENCE")
		checkAudience := token.Claims.(jwt.MapClaims).VerifyAudience(aud, false)
		if !checkAudience {
			return token, errors.New("Invalid audience.")
		}
		// verify iss claim
		iss := os.Getenv("AUTH0_DOMAIN")
		checkIss := token.Claims.(jwt.MapClaims).VerifyIssuer(iss, false)
		if !checkIss {
			return token, errors.New("Invalid issuer.")
		}

		cert, err := getPemCert(token)
		if err != nil {
			log.Fatalf("could not get cert: %+v", err)
		}

		result, _ := jwt.ParseRSAPublicKeyFromPEM([]byte(cert))
		return result, nil
	},
	SigningMethod: jwt.SigningMethodRS256,
})

func getPemCert(token *jwt.Token) (string, error) {
	cert := ""

	resp, err := http.Get(os.Getenv("AUTH0_DOMAIN") + ".well-known/jwks.json")
	if err != nil {
		return cert, err
	}

	defer resp.Body.Close()

	jwks := Jwks{}
	err = json.NewDecoder(resp.Body).Decode(&jwks)

	if err != nil {
		return cert, err
	}

	x5c := jwks.Keys[0].X5c
	for k,v := range x5c {
		if token.Header["kid"] == jwks.Keys[k].Kid {
			cert = "-----BEGIN CERTIFICATE-----\n" + v + "\n-----END CERTIFICATE-----"
		}
	}

	if cert == "" {
		return cert, errors.New("Unable to find appropriate key")
	}

	return cert, nil
}

func authMiddleware() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		err := jwtMiddleware.CheckJWT(ctx.Writer, ctx.Request)
		if err != nil {
			fmt.Println(err)
			ctx.Abort()
			ctx.Writer.WriteHeader(http.StatusUnauthorized)
			ctx.Writer.Write([]byte("Unauthorized"))
			return
		}
	}
}

func main() {
	// Create a router
	router := gin.Default()

	router.Use(static.Serve("/", static.LocalFile("./views", true)))

	api := router.Group("/api")

	api.GET("/", func (ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{
			"message": "pong",
		})
	})

	api.GET("/quotes", authMiddleware(),  Quotes)
	api.POST("/quotes/like/:quoteId", authMiddleware(),  LikeQuote)

	router.Run(":3003")

}

func Quotes(ctx *gin.Context) {
	ctx.Header("Content-Type", "Application/JSON")
	ctx.JSON(http.StatusOK, quotes)
}

func LikeQuote(ctx *gin.Context) {
	ctx.Header("Content-Type", "Application/JSON")
	if quoteId, err := strconv.Atoi(ctx.Param("quoteId")); err == nil {
		for i := range quotes {
			if quotes[i].ID == quoteId {
				quotes[i].Likes += 1
			}
		}
		ctx.JSON(http.StatusOK, &quotes)
	} else {
		ctx.AbortWithStatus(http.StatusUnprocessableEntity)
	}

}
