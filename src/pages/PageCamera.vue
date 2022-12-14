<template>
  <q-page class="constrain q-pa-md row justify-center">
    <div
      class="camera-frame q-pa-md col-6 col-md-4 row justify-center items-center"
    >
      <video v-show="!isCaptured" ref="video" autoplay class="full-width" />
      <canvas v-show="isCaptured" ref="canvas" class="full-width" />
    </div>
    <div class="text-center q-pa-md col-12">
      <div class="q-gutter-md">
        <q-btn
          v-if="hasCameraAccess"
          :disabled="isCaptured"
          @click="captureImage"
          round
          color="grey-10"
          size="lg"
          icon="eva-camera"
        />
        <q-btn
          v-if="hasCameraAccess"
          :disabled="!isCaptured"
          @click="resetImage"
          round
          color="grey-10"
          size="lg"
          icon="eva-refresh-outline"
        />
        <q-file
          v-else
          @update:model-value="captureImageFallback"
          outlined
          label="Choose an image"
          accept="image/*"
          v-model="imageUpload"
        >
          <template v-slot:prepend>
            <q-icon name="eva-attach-outline" />
          </template>
        </q-file>
      </div>
    </div>
    <div class="col-12 col-sm-6 row justify-center q-gutter-md">
      <q-input
        class="col-12"
        v-model="post.caption"
        label="Caption"
        dense="dense"
      />
      <q-input
        :loading="isLocationLoading"
        class="col-12"
        v-model="post.location"
        label="Location"
        dense="dense"
      >
        <template v-slot:append>
          <q-btn
            v-if="!isLocationLoading"
            @click="getLocation"
            round
            dense
            flat
            icon="eva-navigation-2-outline"
          />
        </template>
      </q-input>
      <q-btn
        :disabled="!isCaptured || !post.caption"
        @click="addPost"
        unelevated
        rounded
        color="primary"
        label="Add a new post"
      />
    </div>
  </q-page>
</template>

<script>
import { uid } from "quasar";
import axios from "axios";
require("md-gum-polyfill");

export default {
  name: "PageCamera",
  data() {
    return {
      post: {
        id: uid(),
        caption: "",
        location: "",
        photo: null,
        date: Date.now(),
      },
      isCaptured: false,
      imageUpload: [],
      hasCameraAccess: true,
      isLocationLoading: false,
    };
  },
  methods: {
    checkGetUserMedia() {
      if (
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        console.log("cannot access camera source");
      }
    },
    initCamera() {
      navigator.mediaDevices
        .getUserMedia({
          video: true,
        })
        .then((stream) => {
          this.$refs.video.srcObject = stream;
        })
        .catch((error) => {
          this.hasCameraAccess = false;
        });
    },
    captureImage() {
      let video = this.$refs.video;
      let canvas = this.$refs.canvas;

      canvas.width = video.getBoundingClientRect().width;
      canvas.height = video.getBoundingClientRect().height;

      let context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      this.disableCamera();
      this.isCaptured = true;
      this.post.photo = this.dataURItoBlob(canvas.toDataURL());
    },
    resetImage() {
      this.isCaptured = false;
      this.post.photo = null;
      this.initCamera();
    },
    captureImageFallback(file) {
      this.post.photo = file;

      let canvas = this.$refs.canvas;
      let context = canvas.getContext("2d");

      let reader = new FileReader();
      reader.onload = (event) => {
        let img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          context.drawImage(img, 0, 0);
          this.isCaptured = true;
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    },
    disableCamera() {
      this.$refs.video.srcObject.getVideoTracks().forEach((track) => {
        track.stop();
      });
    },
    dataURItoBlob(dataURI) {
      // convert base64 to raw binary data held in a string
      // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
      var byteString = atob(dataURI.split(",")[1]);

      // separate out the mime component
      var mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];

      // write the bytes of the string to an ArrayBuffer
      var ab = new ArrayBuffer(byteString.length);

      // create a view into the buffer
      var ia = new Uint8Array(ab);

      // set the bytes of the buffer to the correct values
      for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }

      // write the ArrayBuffer to a blob, and you're done
      var blob = new Blob([ab], { type: mimeString });
      return blob;
    },
    async getLocation() {
      this.isLocationLoading = true;
      try {
        let location = await fetch(
          `http://ip-api.com/json/?fields=city,country`
        );
        let json = await location.json();
        this.post.location = json.city + ", " + json.country;
      } catch (error) {
        this.$q.notify({
          position: "top",
          color: "grey-6",
          message: "Unable to identify your location",
          icon: "eva-alert-circle-outline",
        });
      }
      this.isLocationLoading = false;
    },
    addPost() {
      this.$q.loading.show({
        message: "Adding a new post...",
      });

      let formData = new FormData();

      formData.append("id", this.post.id);
      formData.append("caption", this.post.caption);
      formData.append("location", this.post.location);
      formData.append("date", this.post.date);
      formData.append("file", this.post.photo, this.post.id + ".png");

      axios
        .post(`${process.env.API}/createPost`, formData)
        .then((response) => {
          console.log(response);
          this.$q.loading.hide();
          this.$router.push("/");
        })
        .catch((err) => {
          console.log(err);
          this.$q.loading.hide();
          this.$q.notify({
            type: "negative",
            position: "top",
            message: "Couldn't add a new post",
          });
        });

      console.log("addPost method triggered");
    },
  },
  mounted() {
    this.initCamera();
    this.checkGetUserMedia();
  },
  beforeUnmount() {
    if (this.hasCameraAccess) {
      this.disableCamera();
    }
  },
};
</script>

<style lang="sass">
.camera-frame
  border: 2px solid $grey-10
  border-radius: 10px
</style>
