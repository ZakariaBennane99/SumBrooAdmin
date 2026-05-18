import { Schema, model } from "mongoose";

const MediaContentSchema = new Schema({
    mediaType: {
        type: String,
        enum: ["image", "video", "audio"],
        required: true
    },
    awsLink: {
        type: String,
        required: true
    },
    videoCover: {
        type: String
    }
});

const PinterestTextualDataSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    destinationLink: {
        type: String,
        required: true
    }
});

const TextualDataSchema = new Schema({
    pinterest: PinterestTextualDataSchema
});

const PostContentSchema = new Schema({
    media: MediaContentSchema,
    textualData: TextualDataSchema
});

const PostSchema = new Schema({
    postTitle: {
        type: String
    },
    postStatus: {
        type: String,
        enum: ["in review", "rejected", "published"], 
        required: true
    },
    hostUserId: {
        type: String
    },
    platform: String,
    postLink: String,
    postId: String,
    publishingDate: Date,
    content: PostContentSchema,
    targetingNiche: {
        type: String,
        required: true
    },
    targetingTags: {
        type: [String],
        required: true
    },
    comment: String,
    analytics: {
        type: Schema.Types.Mixed
    }
});

const SocialMediaLinkSchema = new Schema({
    platformName: {
        type: String,
        required: true
    },
    profileLink: {
        type: String,
        required: true
    }, 
    profileStatus: {
        type: String,
        enum: ["inReview", "pendingPay", "pendingAuth", "active", "canceled", "authExpired"],
        required: true
    }, 
    pricePlans: {
        type: [String]
    },
    description: {
        type: String
    },
    niche: {
        type: String
    },
    lastReceivingDate: {
        type: Date,
        default: new Date(0)
    },
    audience: {
        type: [String],
        validate: {
            validator: function(array) {
                return array.length <= 10;
            },
            message: 'Audience array size should not exceed 10 tags.'
        }
    },
    accessToken: {
        type: String
    },
    accesstokenExpirationDate: {
        type: Date
    }, 
    refreshToken: {
        type: String
    },
    refreshTokenExpirationDate: {
        type: Date
    },
    posts: [PostSchema]
});

const UserSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    accountStatus: {
        type: String,
        enum: ["inReview", "disabled", "active", "pending"],
        required: true
    }, 
    password: {
        type: String
    },
    initialPlanChosen: {
        type: String
    },
    onboardingStep: {
        type: Number,
        default: 0
    },
    applicationDate: {
        type: String, 
        required: true
    },
    stripeId: {
        type: String,
        unique: false
    },
    socialMediaLinks: [SocialMediaLinkSchema]
});

export default UserSchema;