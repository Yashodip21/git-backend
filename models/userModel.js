const mongoose =  require ("mongoose");

const {Schema} = mongoose;

const UserSchema = new Schema({
    // timestamps:true,

    username:{
        type:String,
    },
    userName:{
        type:String,
    },
    email:{
        type:String,
    },
    password:{
        type:String,
    },
    profileImage:{
        type:String,
        default:"",
    },
    reposotories:[
        {
            default:[],
            type:Schema.Types.ObjectId,
            ref:"Repository",

        }
    ],
    followedUsers:[
        {
            default:[],
            type:Schema.Types.ObjectId,
            ref:"User",

        }
    ],
    followers:[
        {
            default:[],
            type:Schema.Types.ObjectId,
            ref:"User",

        }
    ],
    starRepos:[
        {
            default:[],
            type:Schema.Types.ObjectId,
            ref:"Repository",

        }
    ],
});

const User = mongoose.model("User",UserSchema);

module.exports = User;

